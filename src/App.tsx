import { LayersList } from "@deck.gl/core";
import { ArcLayer } from "@deck.gl/layers";
import { MapboxOverlay, MapboxOverlayProps } from "@deck.gl/mapbox";
import Slider from "@mui/material/Slider";
import { fromUnixTime, getUnixTime, lightFormat, max, min } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import {
  Map,
  ViewState,
  useControl,
  AttributionControl,
} from "react-map-gl/maplibre";
import "./App.css";
import { Calendar } from "./Calendar";
import { Mapmarkers } from "./Mapmarkers";
import { ArcDatum, Btl, NapoleonicWarsJSON, ArcPartial } from "./types";
import { useAtom, useSetAtom } from "jotai";
import { prevDateAtom, unixDateAtom } from "./atoms";

const INITIAL_VIEW_STATE: Partial<ViewState> = {
  latitude: 44.13,
  longitude: 7.92,
  zoom: 4,
};
function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

//// turns milliseconds into days
function getDurationDays(milli: number) {
  const minutes = Math.floor(milli / 60000);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  return days;
}

function App() {
  const [events, setEvents] = useState<Btl[]>([]);

  const [minDate, setMinDate] = useState(0);
  const [maxDate, setMaxDate] = useState(0);
  const [unixDate, setUnixDate] = useAtom(unixDateAtom);
  const setPrevDate = useSetAtom(prevDateAtom);

  const [eventMarks, setEventMarks] = useState<
    {
      value: number;
      label: string;
    }[]
  >([]);

  const [arcsData, setArcsData] = useState<ArcDatum[]>([]);
  const colArcPast: [number, number, number, number] = [245, 127, 23, 100];
  const colArcFuture: [number, number, number, number] = [245, 127, 23, 50];
  const layers: LayersList = useMemo(() => {
    return [
      new ArcLayer({
        id: "arcs",
        data: arcsData,
        getSourcePosition: (f: ArcDatum) => f.source.position,
        getTargetPosition: (f: ArcDatum) => f.target.position,
        getSourceColor: (item: ArcDatum): [number, number, number, number] => {
          const t = fromUnixTime(unixDate);
          if (item.target.dateArrival < t) return colArcPast;
          if (item.source.dateDeparture > t) return colArcFuture;

          const atEndZero = getUnixTime(item.target.dateArrival) - unixDate;
          const normaliseBy =
            getUnixTime(item.target.dateArrival) -
            getUnixTime(item.source.dateDeparture);
          // return brown with 100% opacity when time close to start, more transparent when t closer to arrival date end of arc
          return [161, 136, 127, (255 * atEndZero) / normaliseBy];
        },
        getTargetColor: (item: ArcDatum) => {
          const t = fromUnixTime(unixDate);
          if (item.target.dateArrival < t) return colArcPast;
          if (item.source.dateDeparture > t) return colArcFuture;

          const atStartZero = unixDate - getUnixTime(item.source.dateDeparture);
          const normaliseBy =
            getUnixTime(item.target.dateArrival) -
            getUnixTime(item.source.dateDeparture);
          // return green with high transparency when time close to start, 100% opacity when time close to end of arc
          return [51, 105, 30, (255 * atStartZero) / normaliseBy];
        },
        getWidth: (item: ArcDatum) => {
          const t = fromUnixTime(unixDate);
          if (item.source.dateDeparture < t && item.target.dateArrival > t)
            return 5;
          return 2;
        },
        updateTriggers: {
          // deck.gl does not reevaluate accessors per default
          getWidth: [unixDate],
          getSourceColor: [unixDate],
          getTargetColor: [unixDate],
        },
      }),
    ];
  }, [arcsData, unixDate]);

  //const dateCurr = useMemo(() => fromUnixTime(unixDate), [unixDate]);

  // console.log("[App.tsx]", dateCurr, unixDateCurr);
  const handleTimeSlider = (_event: Event, newValue: number | number[]) => {
    const newDate = newValue as number;
    setUnixDate(newDate);
    setPrevDate(newDate);
  };

  useEffect(() => {
    if (events.length === 0) return;

    const d1 = min(events.map((b) => b.date1));
    setMinDate(getUnixTime(d1));
    const d2 = max(events.map((b) => b.date2));
    setMaxDate(getUnixTime(d2));
    setUnixDate(getUnixTime(d1));
    // console.log(
    //   "[App.tsx] setting prevDate to",
    //   d1,
    //   " it was:",
    //   fromUnixTime(prevDateDEBUG)
    // );
    setPrevDate(getUnixTime(d1));

    // get years between d1 and d2, as getUnixTime
  }, [events]);

  useEffect(() => {
    fetch("/data/nw.json")
      .then((res): Promise<NapoleonicWarsJSON> => res.json())
      .then((battles) => {
        const b: Btl[] = battles.map((b) => {
          const date1 = new Date(
            b["Year1,N,10,0"],
            b["Month1,N,10,0"],
            b["Day1,N,10,0"]
          );
          const date2 =
            b["Year2,N,10,0"] === 0
              ? date1
              : new Date(
                  b["Year2,N,10,0"],
                  b["Month2,N,10,0"],
                  b["Day2,N,10,0"]
                );

          return {
            battle: b["Battle,C,254"],
            position: [b["Longitude,N,24,15"], b["Latitude,N,24,15"]],
            radius: parseInt(b["Dead_or_Wo,C,254"] || ""),
            color: [255, 0, 0, 100],
            date1,
            date2,
            duration: getDurationDays(date2.getTime() - date1.getTime()),
            artifacts: b["French Com,C,254"]?.includes("Napoleon Bonaparte")
              ? "Napoleon Bonaparte"
              : "", // only track Napoleon Bonaparte for now
          };
        });

        // prepare arc tracking of artifacts
        // const arcs = [{source:[2.349014, 48.864716], target:[]}];
        // const arcsCoords = [[2.349014, 48.864716]]; // start with Paris
        const arcsCoords: ArcPartial[] = [];
        b.forEach((b) => {
          if (b.artifacts === "Napoleon Bonaparte") {
            arcsCoords.push({
              position: b.position,
              dateArrival: b.date1,
              dateDeparture: b.date2,
            });
          }
        });
        // pair the coordinates up, so for 10 coords we have 9 pairs==9 arcs
        const arcs = arcsCoords.slice(1).map((target, i) => {
          return { source: arcsCoords[i], target };
        });
        setArcsData(arcs);

        setEventMarks(
          b.map((v) => {
            // mark every start on the slider
            return { value: getUnixTime(v.date1), label: "" };
          })
        );
        setEvents(b);
      });
  }, []);

  return (
    <>
      <Calendar start={fromUnixTime(minDate)} end={fromUnixTime(maxDate)} />
      <div className="info">
        <h2>{lightFormat(fromUnixTime(unixDate), "yyyy-MM-dd")}</h2>
      </div>
      <div className="control">
        <Slider
          aria-label="time"
          value={unixDate}
          min={minDate}
          max={maxDate}
          onChange={handleTimeSlider}
          marks={eventMarks}
          track={false}
        />
      </div>
      <Map
        initialViewState={INITIAL_VIEW_STATE}
        attributionControl={false}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >
        <DeckGLOverlay layers={layers} /* interleaved */ />
        <AttributionControl position="top-right" compact={false} />
        {/* <NavigationControl position="top-right" /> */}

        <Mapmarkers battleDots={events} dateCurr={fromUnixTime(unixDate)} />
      </Map>
    </>
  );
}

export default App;
