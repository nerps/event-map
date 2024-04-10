import * as React from "react";
import { format, getMonth, getYear, setMonth } from "date-fns";

export function Monthline({ date }: { date: Date }) {
  // const year = getYear(date);
  const month = getMonth(date);
  const months = [...Array(12).keys()].map((m) => {
    const temp = setMonth(date, m);
    return format(temp, "MMM");
  });
  // console.log(months);
  const items: React.ReactElement[] = [];
  months.forEach((monthName, i) => {
    const hideLastSeparator: React.CSSProperties =
      i === 11 ? { display: "none" } : {};

    const monthHighlight: React.CSSProperties =
      i === month ? { fontWeight: "bold" } : {};

    items.push(
      <div className="calendarName" style={monthHighlight} key={i + "a"}>
        {monthName}
      </div>
    );

    const dotHighlight: React.CSSProperties =
      i === month ? { backgroundColor: "#717171" } : {};

    items.push(
      <div
        key={i + "b"}
        style={{
          gridColumn: "2/2",
          display: "flex",
          flexDirection: "column",
          // height: "100%",
          height: "3em",
        }}
      >
        <div className="calendarDot" style={dotHighlight}></div>
        <div
          className="calendarSeparator"
          style={{ ...dotHighlight, ...hideLastSeparator }}
        ></div>
      </div>
    );

    items.push(
      <div key={i + "c"} style={{ gridColumn: "3/3" }}>
        some links
      </div>
    );
  });
  return <div className="calendar">{items}</div>;
}

export function Weekline({ date }: { date: Date }) {
  const year = getYear(date);

  return (
    <div className="timeline">
      <h1>{year}</h1>
    </div>
  );
}
