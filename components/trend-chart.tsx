"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface TrendPoint {
  year: number;
  actual: number | null;
  planned: number | null;
}

const fmt = (n: number) => n.toLocaleString("et-EE", { maximumFractionDigits: 1 });

/** Mõõdiku trend: tegelik (joon), planeeritud trajektoor (katkendjoon), siht (horisontaal). */
export function TrendChart({
  points,
  target,
  unit,
  reportYear,
}: {
  points: TrendPoint[];
  target: number | null;
  unit: string;
  reportYear: number;
}) {
  const values = points.flatMap((p) => [p.actual, p.planned]).filter((v): v is number => v != null);
  if (target != null) values.push(target);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.15, 1);
  return (
    <div className="h-56 w-full" role="img" aria-label="Mõõdiku trend: tegelik, planeeritud ja siht">
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 12, right: 56, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="year" tickFormatter={(y) => `${Number(y) - 1}/${String(y).slice(2)}`} tick={{ fill: "var(--text-3)", fontSize: 12 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
          <YAxis
            domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
            tick={{ fill: "var(--text-3)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <ReferenceLine x={reportYear} stroke="var(--text-3)" strokeDasharray="2 3" />
          {target != null && (
            <ReferenceLine
              y={target}
              stroke="var(--text-2)"
              strokeWidth={1}
              label={{ value: `siht ${fmt(target)}`, position: "right", fill: "var(--text-2)", fontSize: 12 }}
            />
          )}
          <Tooltip
            cursor={{ stroke: "var(--text-3)", strokeWidth: 1 }}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, color: "var(--text)" }}
            labelFormatter={(y) => `${Number(y) - 1}/${String(y).slice(2)}`}
            formatter={(v, name) => [v == null ? "—" : `${fmt(Number(v))} ${unit}`, name === "actual" ? "Tegelik" : "Planeeritud"]}
          />
          <Line
            type="linear"
            dataKey="planned"
            stroke="var(--plan)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
            name="planned"
          />
          <Line
            type="linear"
            dataKey="actual"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive={false}
            name="actual"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1 flex gap-4 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden><line x1="0" y1="4" x2="18" y2="4" stroke="var(--accent)" strokeWidth="2" /></svg>
          Tegelik
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden><line x1="0" y1="4" x2="18" y2="4" stroke="var(--plan)" strokeWidth="1.5" strokeDasharray="5 4" /></svg>
          Planeeritud (algtasemest sihini)
        </span>
      </div>
    </div>
  );
}
