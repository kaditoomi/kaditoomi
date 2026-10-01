import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULE,
  chainBreak,
  directionStatus,
  evaluateIndicator,
  type IndicatorInput,
} from "./status";

const ind = (over: Partial<IndicatorInput> & { value?: number | null }): IndicatorInput => {
  const { value, ...rest } = over;
  return {
    direction: "increase",
    baselineValue: 64,
    baselineYear: 2026,
    targetValue: 72,
    targetYear: 2030,
    results: value == null ? [] : [{ year: 2027, value }],
    ...rest,
  };
};

describe("evaluateIndicator", () => {
  it("roheline, kui areng vastab plaanile (näidisandmete HARNO 64 → 66, siht 72)", () => {
    const e = evaluateIndicator(ind({ value: 66 }), DEFAULT_RULE, 2027);
    expect(e.status).toBe("green");
    expect(e.plannedPct).toBe(25);
    expect(e.achievedPct).toBe(25);
    expect(e.fulfilmentPct).toBe(100);
    expect(e.plannedValue).toBe(66);
  });

  it("kollane 40–74% plaanist (71 → 73, siht 85 → 57%)", () => {
    const e = evaluateIndicator(ind({ baselineValue: 71, targetValue: 85, value: 73 }), DEFAULT_RULE, 2027);
    expect(e.status).toBe("yellow");
    expect(e.fulfilmentPct).toBe(57);
  });

  it("piirid: täpselt 75% → roheline, täpselt 40% → kollane", () => {
    // b=0, t=100, 2027 plaan 25 → 75% plaanist = 18.75, 40% = 10
    const base = { baselineValue: 0, targetValue: 100 };
    expect(evaluateIndicator(ind({ ...base, value: 18.75 }), DEFAULT_RULE, 2027).status).toBe("green");
    expect(evaluateIndicator(ind({ ...base, value: 10 }), DEFAULT_RULE, 2027).status).toBe("yellow");
    expect(evaluateIndicator(ind({ ...base, value: 9.9 }), DEFAULT_RULE, 2027).status).toBe("red");
  });

  it("punane, kui muutust pole", () => {
    expect(evaluateIndicator(ind({ value: 64 }), DEFAULT_RULE, 2027).status).toBe("red");
  });

  it("punane, kui liigub vales suunas", () => {
    const e = evaluateIndicator(ind({ baselineValue: 52, targetValue: 75, value: 50 }), DEFAULT_RULE, 2027);
    expect(e.status).toBe("red");
    expect(e.reason).toMatch(/vales suunas/);
  });

  it("vales suunas, kuid reegel lubab → arvutatakse protsendi järgi (punane)", () => {
    const rule = { ...DEFAULT_RULE, redOnNegative: false };
    const e = evaluateIndicator(ind({ baselineValue: 52, targetValue: 75, value: 50 }), rule, 2027);
    expect(e.status).toBe("red");
    expect(e.reason).not.toMatch(/vales suunas/);
  });

  it("langus: kiusamine 12 → 10,5, siht 7 → roheline (120%)", () => {
    const e = evaluateIndicator(
      ind({ direction: "decrease", baselineValue: 12, targetValue: 7, value: 10.5 }),
      DEFAULT_RULE,
      2027,
    );
    expect(e.status).toBe("green");
    expect(e.fulfilmentPct).toBe(120);
  });

  it("langus: kasv on vales suunas", () => {
    const e = evaluateIndicator(
      ind({ direction: "decrease", baselineValue: 12, targetValue: 7, value: 13 }),
      DEFAULT_RULE,
      2027,
    );
    expect(e.status).toBe("red");
  });

  it("säilimine tolerantsiga", () => {
    const rule = { ...DEFAULT_RULE, maintainTolerance: 3 };
    const m = (value: number) =>
      evaluateIndicator(ind({ direction: "maintain", baselineValue: 82, targetValue: 80, value }), rule, 2027).status;
    expect(m(82)).toBe("green");
    expect(m(79)).toBe("green");
    expect(m(76)).toBe("yellow");
    expect(m(73)).toBe("red");
  });

  it("hall, kui aruandeaasta andmed puuduvad, ja näitab viimast väärtust", () => {
    const e = evaluateIndicator(ind({ results: [{ year: 2027, value: 66 }] }), DEFAULT_RULE, 2028);
    expect(e.status).toBe("gray");
    expect(e.latest).toEqual({ year: 2027, value: 66 });
    expect(e.reason).toMatch(/viimane: 2027/);
  });

  it("hall, kui algtase või siht puudub", () => {
    expect(evaluateIndicator(ind({ baselineValue: null, baselineYear: null, value: 5 }), DEFAULT_RULE, 2027).reason).toBe(
      "Algtase puudub",
    );
    expect(evaluateIndicator(ind({ targetValue: null, value: 5 }), DEFAULT_RULE, 2027).reason).toBe("Sihttase puudub");
  });

  it("eelmine väärtus: eelmine tulemus, muidu algtase", () => {
    const one = evaluateIndicator(ind({ value: 66 }), DEFAULT_RULE, 2027);
    expect(one.previous).toEqual({ year: 2026, value: 64 });
    const two = evaluateIndicator(
      ind({ results: [{ year: 2027, value: 66 }, { year: 2028, value: 67 }] }),
      DEFAULT_RULE,
      2028,
    );
    expect(two.previous).toEqual({ year: 2027, value: 66 });
    expect(two.plannedPct).toBe(50);
  });

  it("tulevikuaasta tulemust ei arvestata", () => {
    const e = evaluateIndicator(ind({ results: [{ year: 2029, value: 70 }] }), DEFAULT_RULE, 2027);
    expect(e.status).toBe("gray");
    expect(e.latest).toBeNull();
  });

  it("vigane seadistus jääb halliks", () => {
    expect(evaluateIndicator(ind({ targetValue: 64, value: 66 }), DEFAULT_RULE, 2027).status).toBe("gray");
    expect(evaluateIndicator(ind({ direction: "decrease", value: 66 }), DEFAULT_RULE, 2027).status).toBe("gray");
    expect(evaluateIndicator(ind({ results: [{ year: 2026, value: 66 }] }), DEFAULT_RULE, 2026).status).toBe("gray");
  });
});

describe("directionStatus", () => {
  it("võtmenäitaja punane → punane", () => {
    expect(
      directionStatus([
        { status: "red", isKey: true },
        { status: "green", isKey: false },
        { status: "green", isKey: false },
      ]).status,
    ).toBe("red");
  });
  it("üks punane mitte-võtmenäitaja kolmest-neljast → kollane", () => {
    expect(
      directionStatus([
        { status: "green", isKey: true },
        { status: "red", isKey: false },
        { status: "green", isKey: false },
        { status: "green", isKey: false },
      ]).status,
    ).toBe("yellow");
  });
  it("vähemalt pooled punased → punane", () => {
    expect(
      directionStatus([
        { status: "red", isKey: false },
        { status: "green", isKey: false },
      ]).status,
    ).toBe("red");
  });
  it("≥ 2/3 rohelised ja ükski punane → roheline; hallid ei loe", () => {
    expect(
      directionStatus([
        { status: "green", isKey: true },
        { status: "green", isKey: false },
        { status: "yellow", isKey: false },
        { status: "gray", isKey: false },
      ]).status,
    ).toBe("green");
  });
  it("ainult hallid → hall", () => {
    expect(directionStatus([{ status: "gray", isKey: true }]).status).toBe("gray");
    expect(directionStatus([]).status).toBe("gray");
  });
  it("näidisandmed: S1 kollane (roheline + kollane)", () => {
    expect(
      directionStatus([
        { status: "green", isKey: true },
        { status: "yellow", isKey: false },
        { status: "gray", isKey: false },
      ]).status,
    ).toBe("yellow");
  });
});

describe("chainBreak", () => {
  it("praktika roheline, õppija tulemus punane → katkestus", () => {
    expect(
      chainBreak([
        { status: "green", impactLevel: "learner_reach" },
        { status: "red", impactLevel: "learner_result" },
      ]),
    ).toBe(true);
  });
  it("praktika ei muutunud → pole katkestus (probleem on varem ahelas)", () => {
    expect(
      chainBreak([
        { status: "yellow", impactLevel: "practice" },
        { status: "red", impactLevel: "learner_result" },
      ]),
    ).toBe(false);
  });
});
