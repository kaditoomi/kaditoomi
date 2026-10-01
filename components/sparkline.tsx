import { fmtNum, yearLabel } from "@/lib/format";

/** Väike trendijoon: algtase + tulemused, siht katkendjoonena. Hover näitab väärtust. */
export function Sparkline({
  points,
  target,
  unit,
  width = 120,
  height = 32,
}: {
  points: { year: number; value: number }[];
  target: number | null;
  unit: string;
  width?: number;
  height?: number;
}) {
  if (points.length === 0) return null;
  const vals = points.map((p) => p.value).concat(target != null ? [target] : []);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const years = points.map((p) => p.year);
  const y0 = Math.min(...years);
  const y1 = Math.max(Math.max(...years), 2030);
  const x = (y: number) => 6 + ((y - y0) / (y1 - y0 || 1)) * (width - 12);
  const y = (v: number) => height - 5 - ((v - min) / span) * (height - 10);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.year).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
      {target != null && (
        <line x1={6} x2={width - 6} y1={y(target)} y2={y(target)} stroke="var(--text-3)" strokeDasharray="3 3" strokeWidth={1} />
      )}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
      {points.map((p) => (
        <g key={p.year}>
          <circle cx={x(p.year)} cy={y(p.value)} r={3} fill="var(--accent)" stroke="var(--surface)" strokeWidth={1.5} />
          <circle cx={x(p.year)} cy={y(p.value)} r={9} fill="transparent">
            <title>{`${yearLabel(p.year)}: ${fmtNum(p.value)} ${unit}`}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
}
