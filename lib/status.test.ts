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

import { changeOf, dataState, defaultThreshold, resultDueDate } from "./status";

describe("changeOf", () => {
  it("skaalal alla 0,1 on muutuseta, 0,1 ja üle on muutus", () => {
    expect(changeOf(3.1, 3.12, "increase", 0.1)).toBe("unchanged");
    expect(changeOf(3.2, 3.3, "increase", 0.1)).toBe("improved");
    expect(changeOf(3.3, 3.2, "increase", 0.1)).toBe("declined");
  });
  it("protsentides alla 2 p.p. on muutuseta", () => {
    expect(changeOf(14.2, 14.6, "decrease", 2)).toBe("unchanged");
    expect(changeOf(14.6, 18.7, "decrease", 2)).toBe("declined");
    expect(changeOf(18.7, 15.0, "decrease", 2)).toBe("improved");
  });
  it("vaikimisi lävi ühiku järgi", () => {
    expect(defaultThreshold("%")).toBe(2);
    expect(defaultThreshold("% nõus")).toBe(2);
    expect(defaultThreshold("skaala 1–5")).toBe(0.1);
  });
});

describe("dataState", () => {
  const base = { baselineValue: 2.8, baselineYear: 2026, targetValue: 3.4, firstMeasurementDue: null, measurementMonth: 6 };
  it("HARNO 2027 tulemus 18.11.2026: ootab mõõtmist, mitte puudus", () => {
    const r = dataState({ ...base, resultYears: [2021, 2026] }, "2026-11-18", 2027);
    expect(r.state).toBe("waiting");
    expect(r.reason).toMatch(/juuni 2027/);
  });
  it("pärast juunit ilma tulemuseta: vajab tähelepanu", () => {
    const r = dataState({ ...base, resultYears: [2026] }, "2027-08-15", 2027);
    expect(r.state).toBe("attention");
    expect(r.reason).toMatch(/2026\/27 tulemus puudub/);
  });
  it("arengukava-eelsed puuduvad aastad ei ole lünk (HARNO õpetajad 2024 → järgmine 2027)", () => {
    const r = dataState({ ...base, baselineYear: 2024, resultYears: [2021, 2024], periodStartYear: 2027 }, "2026-11-18", 2027);
    expect(r.state).toBe("waiting");
    expect(r.reason).toMatch(/juuni 2027/);
  });
  it("tulemus olemas: ok", () => {
    expect(dataState({ ...base, resultYears: [2026, 2027] }, "2027-08-15", 2027).state).toBe("ok");
  });
  it("algtase mõõdetakse sügisel 2027: ootab", () => {
    const r = dataState({ ...base, baselineValue: null, baselineYear: null, targetValue: 70, firstMeasurementDue: "2027-11-30", resultYears: [] }, "2026-11-18", 2027);
    expect(r.state).toBe("waiting");
    expect(r.reason).toMatch(/november 2027/);
  });
  it("algtaseme tähtaeg möödas: vajab tähelepanu", () => {
    const r = dataState({ ...base, baselineValue: null, baselineYear: null, targetValue: 70, firstMeasurementDue: "2027-11-30", resultYears: [] }, "2027-12-15", 2028);
    expect(r.state).toBe("attention");
  });
  it("algtase puudub ja aeg määramata: vajab tähelepanu", () => {
    expect(dataState({ ...base, baselineValue: null, baselineYear: null, resultYears: [] }, "2026-11-18", 2027).state).toBe("attention");
  });
  it("siht kinnitamata (algtase olemas): vajab tähelepanu", () => {
    expect(dataState({ ...base, targetValue: null, resultYears: [2026] }, "2026-11-18", 2027).reason).toMatch(/Siht/);
  });
  it("sügisene mõõtmine kuulub alanud õppeaastasse", () => {
    expect(resultDueDate(2028, 11)).toBe("2027-11-30");
    expect(resultDueDate(2027, 6)).toBe("2027-06-30");
  });
});
