// Staatuse arvutus. Puhas loogika (ilma andmebaasita), et seda saaks testida ja
// et staatus tuleks alati reeglist + andmetest, mitte käsitsi valikust.
// Reeglite kirjeldus: docs/02-andmemudel.md#staatuse-arvutamine

export type Status = "green" | "yellow" | "red" | "gray";
export type TrendDirection = "increase" | "decrease" | "maintain";
export type IndicatorKind = "outcome" | "process";
export type ImpactLevel = "practice" | "learner_reach" | "learner_result";

export interface StatusRule {
  greenMinPct: number;
  yellowMinPct: number;
  redOnNegative: boolean;
  maintainTolerance: number;
}

export const DEFAULT_RULE: StatusRule = {
  greenMinPct: 75,
  yellowMinPct: 40,
  redOnNegative: true,
  maintainTolerance: 0,
};

export interface ResultPoint {
  year: number;
  value: number;
}

export interface IndicatorInput {
  direction: TrendDirection;
  baselineValue: number | null;
  baselineYear: number | null;
  targetValue: number | null;
  targetYear: number;
  results: ResultPoint[];
}

export interface Evaluation {
  status: Status;
  /** Lühike eestikeelne selgitus, miks staatus on selline. */
  reason: string;
  /** Aruandeaasta tulemus (või null). */
  value: number | null;
  /** Viimane olemasolev tulemus aruandeaastal või varem (näidatakse ka halli puhul). */
  latest: ResultPoint | null;
  /** Eelmine tulemus enne aruandeaasta tulemust (või algtase). */
  previous: ResultPoint | null;
  /** Planeeritud väärtus aruandeaastal (lineaarne trajektoor). */
  plannedValue: number | null;
  /** Mitu % teekonnast algtasemest sihini pidi olema läbitud. */
  plannedPct: number | null;
  /** Mitu % teekonnast on tegelikult läbitud. */
  achievedPct: number | null;
  /** Saavutatud / planeeritud × 100 — selle järgi määratakse värv. */
  fulfilmentPct: number | null;
}

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

function fmt(n: number): string {
  return round(n, 1).toLocaleString("et-EE");
}

export function evaluateIndicator(
  ind: IndicatorInput,
  rule: StatusRule,
  reportYear: number,
): Evaluation {
  const sorted = [...ind.results].sort((a, b) => a.year - b.year);
  const upTo = sorted.filter((r) => r.year <= reportYear);
  const current = upTo.find((r) => r.year === reportYear) ?? null;
  const latest = upTo.at(-1) ?? null;
  const prevResult = current ? upTo.filter((r) => r.year < reportYear).at(-1) ?? null : null;
  const baselinePoint =
    ind.baselineValue != null && ind.baselineYear != null
      ? { year: ind.baselineYear, value: ind.baselineValue }
      : null;
  const previous = prevResult ?? (current ? baselinePoint : null);

  const base: Evaluation = {
    status: "gray",
    reason: "",
    value: current?.value ?? null,
    latest,
    previous,
    plannedValue: null,
    plannedPct: null,
    achievedPct: null,
    fulfilmentPct: null,
  };

  if (ind.baselineValue == null || ind.baselineYear == null) {
    return { ...base, reason: "Algtase puudub" };
  }
  if (ind.targetValue == null) {
    return { ...base, reason: "Sihttase puudub" };
  }
  if (!current) {
    return {
      ...base,
      reason: latest
        ? `${reportYear}. a andmed puuduvad (viimane: ${latest.year})`
        : `${reportYear}. a andmed puuduvad`,
    };
  }

  const b = ind.baselineValue;
  const t = ind.targetValue;
  const v = current.value;

  if (ind.direction === "maintain") {
    const tol = rule.maintainTolerance;
    const shortfall = t - v; // eeldus: suurem on parem
    const status: Status =
      shortfall <= tol ? "green" : shortfall <= 2 * tol ? "yellow" : "red";
    const reason =
      shortfall <= 0
        ? `Säilib: ${fmt(v)} ≥ siht ${fmt(t)}`
        : shortfall <= tol
          ? `Säilib lubatud kõrvalekalde piires (siht ${fmt(t)} ± ${fmt(tol)})`
          : `Langenud alla sihi ${fmt(t)} (lubatud kõrvalekalle ${fmt(tol)})`;
    return { ...base, status, reason, plannedValue: t };
  }

  if (ind.targetYear <= ind.baselineYear) {
    return { ...base, reason: "Sihi aasta peab olema hilisem kui algtaseme aasta" };
  }
  if (t === b) {
    return { ...base, reason: "Siht võrdub algtasemega — kasuta trendisuunda „säilimine“" };
  }
  const expectsIncrease = t > b;
  if ((ind.direction === "increase") !== expectsIncrease) {
    return {
      ...base,
      reason: `Trendisuund (${ind.direction === "increase" ? "kasv" : "langus"}) ei klapi algtaseme ja sihiga`,
    };
  }

  const plannedFraction = Math.min(
    1,
    (reportYear - ind.baselineYear) / (ind.targetYear - ind.baselineYear),
  );
  if (plannedFraction <= 0) {
    return { ...base, reason: "Aruandeaasta ei ole algtaseme aastast hilisem" };
  }
  const achievedFraction = (v - b) / (t - b);
  const fulfilment = (achievedFraction / plannedFraction) * 100;
  const numbers = {
    plannedValue: b + (t - b) * plannedFraction,
    plannedPct: round(plannedFraction * 100),
    achievedPct: round(achievedFraction * 100),
    fulfilmentPct: round(fulfilment, 0),
  };

  if (achievedFraction < 0 && rule.redOnNegative) {
    return {
      ...base,
      ...numbers,
      status: "red",
      reason: `Liigub vales suunas: ${fmt(b)} → ${fmt(v)} (siht ${fmt(t)})`,
    };
  }
  const status: Status =
    fulfilment >= rule.greenMinPct ? "green" : fulfilment >= rule.yellowMinPct ? "yellow" : "red";
  const reason =
    `Läbitud ${fmt(numbers.achievedPct)}% teekonnast, plaan ${fmt(numbers.plannedPct)}% ` +
    `→ ${fmt(numbers.fulfilmentPct)}% plaanist`;
  return { ...base, ...numbers, status, reason };
}

export interface StatusItem {
  status: Status;
  isKey: boolean;
}

/** Arengusuuna üldstaatus tulemusnäitajatest (vt andmemudel). */
export function directionStatus(outcomes: StatusItem[]): { status: Status; reason: string } {
  const known = outcomes.filter((o) => o.status !== "gray");
  if (known.length === 0) {
    return { status: "gray", reason: "Ühelgi tulemusnäitajal pole aruandeaasta andmeid" };
  }
  const red = known.filter((o) => o.status === "red");
  const green = known.filter((o) => o.status === "green");
  if (red.some((o) => o.isKey)) {
    return { status: "red", reason: "Võtmenäitaja on punane" };
  }
  if (red.length * 2 >= known.length) {
    return { status: "red", reason: `${red.length}/${known.length} tulemusnäitajat on punased` };
  }
  if (red.length === 0 && green.length * 3 >= known.length * 2) {
    return { status: "green", reason: `${green.length}/${known.length} tulemusnäitajat on rohelised` };
  }
  return {
    status: "yellow",
    reason: `${green.length} rohelist, ${known.length - green.length - red.length} kollast, ${red.length} punast tulemusnäitajat`,
  };
}

export interface ChainItem {
  status: Status;
  impactLevel: ImpactLevel;
}

/**
 * Mõjuahela katkestus: praktika muutus (või jõudis õppijani), kuid õppija
 * tulemus/kogemus liigub vales suunas või ei parane.
 */
export function chainBreak(items: ChainItem[]): boolean {
  const practiceOk = items.some(
    (i) => (i.impactLevel === "practice" || i.impactLevel === "learner_reach") && i.status === "green",
  );
  const learnerRed = items.some((i) => i.impactLevel === "learner_result" && i.status === "red");
  return practiceOk && learnerRed;
}

const ORDER: Record<Status, number> = { red: 0, yellow: 1, gray: 2, green: 3 };
export const byUrgency = (a: Status, b: Status) => ORDER[a] - ORDER[b];
