import { Mark } from "@mui/base";
import { SxProps, Theme } from "@mui/material";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import { ScaleTime, scaleTime } from "d3-scale";
import {
  differenceInCalendarMonths,
  format,
  fromUnixTime,
  getUnixTime,
  isAfter,
} from "date-fns";
import { useAtom } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
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
  scale: ScaleTime<number, number, never>;
};
const height = 550;
const boxStyle: SxProps<Theme> = {
  height: height + "px",
};
const trapezoidCSS: React.CSSProperties = {
  zIndex: -1,
  position: "absolute",
  height: height + "px",
  width: "0",
  top: 0,
  left: "0px",
  borderRight: "0",
  marginLeft: "-1em", // the box is using 1em padding
  marginTop: "1em",
};

export function Calendar(props: CalendarProps): JSX.Element {
  const [prevDate] = useAtom(prevDateAtom);
  const date = useMemo(() => {
    return fromUnixTime(prevDate);
  }, [prevDate]);

  const scale = scaleTime([props.start, props.end], [0, height]).nice();
  // console.log("[Calendar.tsx]", scale);

  return (
    <div className="calendar">
      <Timerail scale={scale} date={date} />
    </div>
  );
}

/**
 * compute ticks for the following Timerail
 * @param height height in pixels for the Timerail (not used ATM)
 * @param ticks current timerail ticks
 * @param date current time
 * @returns new ticks for the this Timerails child
 */
function computeZoomedScale(
  height: number,
  ticks: Date[],
  date: Date
): ScaleTime<number, number, never> {
  // let's have a variable zoom in factor in the future, now just zoom in to 3 intervals (4 ticks)

  const idxTickAfter = ticks.findIndex((v) => isAfter(v, date)); // the tick immediately after date
  const idx = idxTickAfter === -1 ? ticks.length : idxTickAfter; // if not found, use last tick

  // const i = 3 * Math.ceil(idxTickAfter / 3.0); // always move in batches of 3 intervals
  const i = clamp(idx + 1, 3, ticks.length - 1);
  const interval = [ticks[i - 3], ticks[i]];
  return scaleTime(interval, [0, height]).nice();
}

function Timerail({ date: dateFromAbove, scale }: TimerailProps): JSX.Element {
  const [unixDate, setUnixDate] = useAtom(unixDateAtom);
  const [, setPrevDate] = useAtom(prevDateAtom);
  const ref = useRef<null | HTMLDivElement>(null);
  const ticks = useMemo(() => {
    // the ticks of this Timerail
    if (scale === undefined) return [];
    return scale.ticks();
  }, [scale]);

  // use this for computing ticks for your child Timerail and hand it down to your child
  const [date, setDate] = useState<Date>(dateFromAbove);
  useEffect(() => {
    setDate(dateFromAbove);
  }, [dateFromAbove]);

  function onChange(_e: Event, unixTime: number | number[]) {
    if (typeof unixTime !== "number") return;
    setUnixDate(-unixTime); // update global time, so every rail can show it
    setDate(fromUnixTime(-unixTime)); // update time for children
  }
  function onChangeCommitted() {
    setPrevDate(unixDate); // root to update everyone's date
  }

  const zoomedScale = useMemo(
    () => computeZoomedScale(height, ticks, date),
    [date, ticks]
  );

  const formatted = ticks.map((d) => {
    return {
      date: d,
      year: format(d, "yyyy"),
      month: format(d, "MMM"),
    };
  });
  if (ticks !== undefined && ticks[0] !== undefined) {
    const sameYear = formatted.every((f) => f.year === formatted[0].year);
    const sameMonth = formatted.every((f) => f.month === formatted[0].month);
    formatted.forEach((f) => {
      if (sameYear) f.year = "";
      if (sameMonth) f.month = "";
    });
  }
  // console.log("[Calendar.tsx]", "ticks", ticks);
  const marks: Mark[] = formatted.map((v) => {
    return {
      value: -getUnixTime(v.date),
      label: (
        <div className="timerailLabel">
          <div className="year">{v.year}</div>
          <div className="month">{v.month}</div>
        </div>
      ),
    };
  });

  const diff = differenceInCalendarMonths(ticks[ticks.length - 1], ticks[0]);
  const isAboveOneYear = diff > 12;

  const trapezoidStyles: React.CSSProperties[] = useMemo(() => {
    const styles: React.CSSProperties[] = [];
    const rails = ref.current?.querySelectorAll(".MuiSlider-rail");
    if (rails === undefined || rails.length < 2) return [];

    const r0 = rails[0];
    const r1 = rails[1];
    if (r0 instanceof HTMLSpanElement && r1 instanceof HTMLSpanElement) {
      const railWidth = 4;
      const w =
        r1.getBoundingClientRect().left -
        r0.getBoundingClientRect().left -
        railWidth;
      const l = r0.getBoundingClientRect().left + railWidth;

      const zoomedTicks = zoomedScale.ticks();
      // the faint blueish trapezoid in the background
      styles.push({
        ...trapezoidCSS,
        ...{
          backgroundColor: "rgb(166 198 255 / 31%)",
          left: l + "px",
          width: w + "px",
          clipPath: `polygon(
                0% ${scale(zoomedTicks[0])}px,
                100% ${0}px,
                100% ${height}px,
                0% ${scale(zoomedTicks[zoomedTicks.length - 1])}px
              )`,
        },
      });
      const d = fromUnixTime(unixDate); // current (global) date
      // line through the middle of the trapezoid showing current date
      styles.push({
        ...trapezoidCSS,
        ...{
          backgroundColor: "black",
          left: l + "px",
          width: w + "px",
          clipPath: `polygon(
                0% ${scale(d)}px,
                100% ${zoomedScale(d)}px,
                100% ${zoomedScale(d) + 1}px,
                0% ${scale(d) + 1}px
              )`,
        },
      });
      // line at the top of the trapezoid
      styles.push({
        ...trapezoidCSS,
        ...{
          backgroundColor: "grey",
          left: l + "px",
          width: w + "px",
          clipPath: `polygon(
                0% ${scale(zoomedTicks[0])}px,
                100% ${0}px,
                100% ${1}px,
                0% ${scale(zoomedTicks[0]) + 1}px
              )`,
        },
      });
      // line at the bottom of the trapezoid
      styles.push({
        ...trapezoidCSS,
        ...{
          backgroundColor: "grey",
          left: l + "px",
          width: w + "px",
          clipPath: `polygon(
                0% ${scale(zoomedTicks[zoomedTicks.length - 1])}px,
                100% ${height}px,
                100% ${height + 1}px,
                0% ${scale(zoomedTicks[zoomedTicks.length - 1]) + 1}px
              )`,
        },
      });
    }
    return styles;
  }, [ref, zoomedScale, scale]);

  // a faint trapezoid in the background with black lines to indicate
  // zoom from this Timerail to the next
  const trapezoid = trapezoidStyles.map((s) => {
    return <div style={s} />;
  });

  if (ticks.length === 0) return <></>;
  return (
    <div style={{ display: "flex" }} ref={ref}>
      {isAboveOneYear && trapezoid}
      <Box sx={boxStyle}>
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
          valueLabelDisplay="auto"
          valueLabelFormat={(v: number) => {
            return <div>{format(fromUnixTime(v), "yyyy-MM-dd")}</div>;
          }}
          onChange={onChange}
          onChangeCommitted={onChangeCommitted}
          onKeyDown={preventHorizontalKeyboardNavigation}
        />
      </Box>
      {isAboveOneYear && <Timerail scale={zoomedScale} date={date} />}
    </div>
  );
}
