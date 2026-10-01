import { describe, expect, it } from "vitest";
import { chartSeries } from "./series";
import type { IndicatorView } from "./model";

describe("chartSeries", () => {
  it("planeeritud joon on lineaarne algtasemest sihini", () => {
    const i = {
      id: "x", code: "X", name: "X", unit: "%", direction: "increase",
      baselineValue: 60, baselineYear: 2026, targetValue: 100, targetYear: 2030,
      results: [{ year: 2027, value: 74 }],
    } as unknown as IndicatorView;
    const s = chartSeries(i);
    expect(s.points.map((p) => p.planned)).toEqual([60, 70, 80, 90, 100]);
    expect(s.points.map((p) => p.actual)).toEqual([60, 74, null, null, null]);
  });
});
