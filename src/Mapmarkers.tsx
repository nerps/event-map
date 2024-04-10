import { addDays, differenceInDays, formatDistance } from "date-fns";
import { Marker } from "react-map-gl/maplibre";
import { Btl } from "./types";

export function Mapmarkers({
  battleDots,
  dateCurr,
}: {
  battleDots: Btl[];
  dateCurr: Date;
}) {
  return battleDots.map((b) => {
    // compare to current slider date
    const daysToEvent = differenceInDays(b.date1, dateCurr);
    const daysSinceEvent = differenceInDays(dateCurr, b.date2);
    const numDaysLag = 200;
    if (daysToEvent < numDaysLag && daysSinceEvent < numDaysLag) {
      const eventWidth = Math.log(b.duration + 1.4) * 25;

      let opacity = 1; // fade in/out with quadratic easing
      let durationCSS: React.CSSProperties = {};
      let indicatorCSS: React.CSSProperties = {};
      if (daysToEvent > 1) {
        indicatorCSS = {
          gridColumn: 1,
          marginLeft: `${(1 - daysToEvent / numDaysLag) * 100}%`,
        };
        opacity = Math.pow(1 - daysToEvent / numDaysLag, 2);
      } else if (daysSinceEvent > 1) {
        indicatorCSS = {
          gridColumn: 3,
          marginLeft: `${(daysSinceEvent / numDaysLag) * 100}%`,
        };
        opacity = Math.pow(1 - daysSinceEvent / numDaysLag, 2);
      } else {
        durationCSS = { boxShadow: "inset 0 0 2px rgb(71, 71, 71)" };
        indicatorCSS = {
          gridColumn: 2,
          marginLeft: `${
            (100 * daysToEvent) / (daysToEvent + daysSinceEvent)
          }%`,
          height: "1em",
          width: "0",
          border: "1px solid #fff",
          // borderLeft: 0,
          borderRadius: 0,
        };
      }

      //

      return (
        <Marker
          longitude={b.position[0]}
          latitude={b.position[1]}
          key={b.battle}
          style={{ opacity: opacity.toFixed(5) }}
        >
          <div
            className="line"
            style={{ gridTemplateColumns: `100px ${eventWidth}px 100px` }}
          >
            <div className="pre" />
            <div className="duration" style={durationCSS} />
            <div className="post" />
            <div className="indicator" style={indicatorCSS} />
          </div>
          <span className="eventText">
            {b.battle} ({formatDistance(b.date1, addDays(b.date2, 1))})
          </span>
        </Marker>
      );
    }
  });
}
