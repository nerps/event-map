import { useState, useEffect, useMemo } from "react";
import { min, max, fromUnixTime, lightFormat, getUnixTime } from "date-fns";
import "./App.css";
import Map, { ViewState } from "react-map-gl/maplibre";
import Slider from "@mui/material/Slider";
import { Monthline } from "./Calendar";
import { Mapmarkers } from "./Mapmarkers";
import { Btl, NapoleonicWarsJSON } from "./types";

const INITIAL_VIEW_STATE: Partial<ViewState> = {
  latitude: 44.13,
  longitude: 7.92,
  zoom: 8,
};
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
  const [unixDateCurr, setUnixDateCurr] = useState(1); // current slider date as a Unix Timestamp
  const [eventMarks, setEventMarks] = useState<
    {
      value: number;
      label: string;
    }[]
  >([]);

  const dateCurr = useMemo(() => fromUnixTime(unixDateCurr), [unixDateCurr]);

  const handleTimeSlider = (_event: Event, newValue: number | number[]) => {
    const newDate = newValue as number;
    setUnixDateCurr(newDate);
  };

  useEffect(() => {
    if (events.length === 0) return;

    const d1 = min(events.map((b) => b.date1));
    setMinDate(getUnixTime(d1));
    const d2 = max(events.map((b) => b.date2));
    setMaxDate(getUnixTime(d2));
    setUnixDateCurr(getUnixTime(d1));

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
      <Monthline date={dateCurr} />
      <div className="info">
        <h2>{lightFormat(dateCurr, "yyyy-MM-dd")}</h2>
      </div>
      <div className="control">
        <Slider
          aria-label="time"
          value={unixDateCurr}
          min={minDate}
          max={maxDate}
          onChange={handleTimeSlider}
          marks={eventMarks}
        />
      </div>
      <Map
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        // mapStyle="https://api.maptiler.com/maps/streets/style.json?key=get_your_own_key"
      >
        <Mapmarkers battleDots={events} dateCurr={dateCurr} />
      </Map>
    </>
  );
}

export default App;
