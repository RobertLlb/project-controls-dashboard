import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SCurvePoint } from "../types";

interface SCurveChartProps {
  data: SCurvePoint[];
  statusWeek: number;
}

const formatTooltipValue = (value: unknown): string =>
  typeof value === "number" ? `${value.toFixed(1)}%` : "n/a";

export function SCurveChart({ data, statusWeek }: SCurveChartProps) {
  const status = data.find((point) => point.week === statusWeek);
  const summary =
    status && status.actual !== null
      ? `At week ${statusWeek}, planned progress is ${status.planned.toFixed(1)} percent and actual progress is ${status.actual.toFixed(1)} percent.`
      : "S-curve of planned versus actual cumulative progress.";

  return (
    <figure className="chart">
      <figcaption className="chart__caption">
        <span className="legend legend--planned">Planned</span>
        <span className="legend legend--actual">Actual</span>
        <span className="chart__axis">X axis: project week</span>
      </figcaption>
      <div className="chart__plot" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--rule)" strokeDasharray="2 4" />
            <XAxis dataKey="week" tickLine={false} stroke="var(--ink-soft)" />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(value: number) => `${value}%`}
              tickLine={false}
              stroke="var(--ink-soft)"
              width={48}
            />
            <Tooltip
              formatter={formatTooltipValue}
              labelFormatter={(week) => `Week ${String(week)}`}
              contentStyle={{ background: "var(--paper)", border: "1px solid var(--ink)", borderRadius: 0 }}
            />
            <ReferenceLine
              x={statusWeek}
              stroke="var(--ink)"
              strokeDasharray="4 3"
              label={{ value: "Status date", position: "top", fill: "var(--ink)", fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="planned"
              name="Planned"
              stroke="var(--planned)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="var(--actual)"
              strokeWidth={3}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
