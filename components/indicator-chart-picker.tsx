"use client";

import { useState } from "react";
import { TrendChart, type TrendPoint } from "./trend-chart";

export interface ChartSeries {
  id: string;
  label: string;
  unit: string;
  target: number | null;
  points: TrendPoint[];
}

export function IndicatorChartPicker({ series, reportYear }: { series: ChartSeries[]; reportYear: number }) {
  const [id, setId] = useState(series[0]?.id);
  const current = series.find((s) => s.id === id) ?? series[0];
  if (!current) return <p className="text-sm text-ink-3">Mõõdikuid pole.</p>;
  return (
    <div>
      <label className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-3">Mõõdik</span>
        <select value={current.id} onChange={(e) => setId(e.target.value)} className="input max-w-xl">
          {series.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <TrendChart points={current.points} target={current.target} unit={current.unit} reportYear={reportYear} />
    </div>
  );
}
