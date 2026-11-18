import type { ChartSeries } from "@/components/indicator-chart-picker";
import type { IndicatorView } from "./model";
import { evaluateIndicator, type Status } from "./status";
import { toRule } from "./model";

/** Diagrammi andmed: tegelik väärtus ja lineaarne plaan algtasemest sihini. */
export function chartSeries(i: IndicatorView): ChartSeries {
  // Algab varaseimast mõõtmisest (ajalugu, nt HARNO 2021), muidu algtaseme aastast.
  const start = Math.min(i.results[0]?.year ?? Infinity, i.baselineYear ?? Infinity, i.targetYear);
  const points = [];
  for (let y = start; y <= Math.max(i.targetYear, i.results.at(-1)?.year ?? 0); y++) {
    const measured = i.results.find((r) => r.year === y)?.value;
    // Tegelik väärtus = mõõtmine; algtase (sageli mitme aasta keskmine) ainult siis, kui mõõtmist pole.
    const actual = measured ?? (y === i.baselineYear ? i.baselineValue : null);
    let planned: number | null = null;
    if (
      i.baselineValue != null && i.baselineYear != null && i.targetValue != null &&
      i.targetYear > i.baselineYear && y >= i.baselineYear
    ) {
      planned =
        i.direction === "maintain"
          ? i.targetValue
          : i.baselineValue +
            (i.targetValue - i.baselineValue) *
              Math.min(1, Math.max(0, (y - i.baselineYear) / (i.targetYear - i.baselineYear)));
    }
    points.push({ year: y, actual, planned });
  }
  return { id: i.id, label: `${i.code} · ${i.name}`, unit: i.unit, target: i.targetValue, points };
}

/** Staatus iga aasta kohta (ajajoone jaoks). */
export function statusForYear(i: IndicatorView, year: number): Status {
  return evaluateIndicator(
    {
      direction: i.direction,
      baselineValue: i.baselineValue,
      baselineYear: i.baselineYear,
      targetValue: i.targetValue,
      targetYear: i.targetYear,
      results: i.results.map((r) => ({ year: r.year, value: r.value })),
    },
    toRule(i.rule),
    year,
  ).status;
}
