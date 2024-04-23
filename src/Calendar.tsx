import { Mark } from "@mui/base";
import { SxProps, Theme } from "@mui/material";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import { scaleTime } from "d3-scale";
import {
  differenceInCalendarMonths,
  eachYearOfInterval,
  fromUnixTime,
  getUnixTime,
  getYear,
  isAfter,
  isWithinInterval,
} from "date-fns";
import { useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { prevDateAtom, unixDateAtom } from "./atoms";
import { clamp } from "./misc";

function preventHorizontalKeyboardNavigation(event: React.KeyboardEvent) {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
  }
}

type CalendarProps = {
  start: Date;
  end: Date;
};
type TimerailProps = {
  date: Date;
  ticks: Date[]; // ticks precomputed by preceeding Timerail
  // ppState: [
  //   // report coords to preceeding Timerail
  //   PolygonProjection,
  //   React.Dispatch<React.SetStateAction<PolygonProjection>>
  // ];
};
const height = 550;
const boxStyle: SxProps<Theme> = {
  height: height + "px",
};

type PolygonProjection = {
  railBoundingClientLeft: number;
  leftTimespanProjectedHere: { top: number; bottom: number };
  rightTimespanProjectedHere: { top: number; bottom: number };
};
const polygonProjectionDefault: PolygonProjection = {
  railBoundingClientLeft: 0,
  leftTimespanProjectedHere: { top: 0, bottom: 0 },
  rightTimespanProjectedHere: { top: 0, bottom: 0 },
};

export function Calendar(props: CalendarProps): JSX.Element {
  // console.log("[Calendar.tsx]", "Calendar", "date prop", props.date);
  const [prevDate] = useAtom(prevDateAtom);
  const date = useMemo(() => {
    // console.log("[Calendar.tsx]", "Calendar", fromUnixTime(prevDate));
    return fromUnixTime(prevDate);
  }, [prevDate]);

  // const [unixDate] = useAtom(unixDateAtom);
  // const [polygonProjection] = useAtom(polygon0);
  // useEffect(() => {
  //   console.log(
  //     "[Calendar.tsx]",
  //     "Calendar",
  //     "0",
  //     polygonProjection.railBoundingClientLeft
  //   );
  // }, [polygonProjection]);

  // const ppState = useState<PolygonProjection>({ ...polygonProjectionDefault });

  const firstRailTicks = scaleTime([props.start, props.end], [0, height])
    .nice()
    .ticks();
  return (
    <div className="calendar">
      <Timerail ticks={firstRailTicks} date={date} />
    </div>
  );
}

function Zoom({
  ref1,
  start,
  end,
}: CalendarProps & {
  ref1: React.MutableRefObject<HTMLDivElement | null>;
}): JSX.Element {
  const [unixDate] = useAtom(unixDateAtom);

  // month scale gets an additional month on top and bottom
  // zoom points to Jan to Dec only
  const oneMonthHeight = height / 13;
  const allMonthsHeight = oneMonthHeight * 12;

  const years = eachYearOfInterval({
    start,
    end,
  });
  const oneYearHeight = height / (years.length - 1);
  const current = fromUnixTime(unixDate);
  const between0 = years.findIndex((value, index, obj) => {
    if (index === obj.length - 1) return true; // reached end
    return isWithinInterval(current, { start: value, end: obj[index + 1] });
  });
  const yearBetween0 = between0 * oneYearHeight;
  const yearBetween1 = yearBetween0 + oneYearHeight;

  const [style, setStyle] = useState<React.CSSProperties>({
    position: "absolute",
    height: height + "px",
    width: "0",
    top: 0,
    left: "0px",
    borderRight: "0",
    backgroundColor: "#1976d223",
    marginLeft: "-1em", // the box is using 1em padding
    marginTop: "1em",
  });
  useEffect(() => {
    const rails = ref1.current?.querySelectorAll(".MuiSlider-rail");
    if (rails === undefined || rails.length < 2) return;

    const r0 = rails[0];
    const r1 = rails[1];
    if (r0 instanceof HTMLSpanElement && r1 instanceof HTMLSpanElement) {
      const railWidth = 4;
      const w =
        r1.getBoundingClientRect().left -
        r0.getBoundingClientRect().left -
        railWidth;
      const l = r0.getBoundingClientRect().left + railWidth;
      // console.log(r1.getBoundingClientRect());
      setStyle({
        ...style,
        ...{
          left: l + "px",
          width: w + "px",
          clipPath: `polygon(
            0% ${yearBetween0}px,
            100% ${oneMonthHeight}px,
            100% ${allMonthsHeight}px,
            0% ${yearBetween1}px
          )`,
        },
      });
    }
  }, [ref1, unixDate]);
  return <div style={style}></div>;
}
// compute ticks for the following Timerail
function computeZoomedTicks(height: number, ticks: Date[], date: Date): Date[] {
  // let's have a variable zoom in factor in the future, now just zoom in to 3 intervals (4 ticks)

  const idxTickAfter = ticks.findIndex((v) => isAfter(v, date)); // the tick immediately after date
  const idx = idxTickAfter === -1 ? ticks.length : idxTickAfter; // if not found, use last tick

  // const i = 3 * Math.ceil(idxTickAfter / 3.0); // always move in batches of 3 intervals
  const i = clamp(idx + 1, 3, ticks.length - 1);
  const interval = [ticks[i - 3], ticks[i]];
  return scaleTime(interval, [0, height]).nice().ticks();
}

function Timerail({ date: dateFromAbove, ticks }: TimerailProps): JSX.Element {
  const [unixDate, setUnixDate] = useAtom(unixDateAtom);
  const [, setPrevDate] = useAtom(prevDateAtom);
  const ref = useRef<null | HTMLDivElement>(null);

  // use this for computing ticks for your child Timerail, hand it down to your child
  const [date, setDate] = useState<Date>(dateFromAbove);
  useEffect(() => {
    // console.log("[Calendar.tsx] Timerail useEffect", dateFromAbove);
    setDate(dateFromAbove);
  }, [dateFromAbove]);

  // const [projectionData, setProjectionData] = ppStatePrev;
  // const ppState = useState<PolygonProjection>({ ...polygonProjectionDefault }); // hand down to the next Timerail

  function onChange(_e: Event, unixTime: number | number[]) {
    if (typeof unixTime !== "number") return;
    setUnixDate(-unixTime); // update global time, so every rail can show it
    setDate(fromUnixTime(-unixTime)); // update time for children
  }
  function onChangeCommitted(/* _e: Event, unixTime: number | number[] */) {
    // if (typeof unixTime !== "number") return;
    // setUnixDate(-unixTime); // update global time, so every rail can show it
    // setDate(fromUnixTime(-unixTime)); // update time for children
    setPrevDate(unixDate); // root to update everyone's date
  }

  const [zoomedTicks, setZoomedTicks] = useState<Date[]>(
    computeZoomedTicks(height, ticks, date)
  );
  useEffect(() => {
    setZoomedTicks(computeZoomedTicks(height, ticks, date));
  }, [date, ticks]);
  // take 3 ticks (double interval), make it the thing we zoom open, with "some" padding

  // console.log("[Calendar.tsx]", "ticks", ticks);
  const marks: Mark[] = ticks.map((y) => {
    return {
      value: -getUnixTime(y),
      label: getYear(y),
      // format(temp, "MMM");
    };
  });

  // useEffect(() => {
  //   // update rail postion (screenspace)
  //   if (ref.current === null) return;
  //   const rail = ref.current.querySelector(".MuiSlider-rail");
  //   if (rail === null) return;
  //   const update = {
  //     railBoundingClientLeft: rail.getBoundingClientRect().left,
  //   };
  //   setProjectionData({ ...projectionData, ...update });
  // }, [ref]);
  const diff = differenceInCalendarMonths(ticks[ticks.length - 1], ticks[0]);
  const isAboveOneYear = diff > 28;

  if (ticks.length === 0) return <></>;

  return (
    <>
      <Box sx={boxStyle} ref={ref}>
        <Slider
          sx={{
            '& input[type="range"]': {
              WebkitAppearance: "slider-vertical",
            },
          }}
          min={marks[marks.length - 1].value}
          max={marks[0].value}
          orientation="vertical"
          track={false}
          scale={(x) => -x}
          value={-unixDate}
          marks={marks}
          aria-label="Timerail"
          valueLabelDisplay="off"
          onChange={onChange}
          onChangeCommitted={onChangeCommitted}
          onKeyDown={preventHorizontalKeyboardNavigation}
        />
      </Box>
      {isAboveOneYear && <Timerail ticks={zoomedTicks} date={date} />}
    </>
  );
}
