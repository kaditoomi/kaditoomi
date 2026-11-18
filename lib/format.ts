import type { ImpactLevel, IndicatorKind, Status, TrendDirection } from "./status";
import type { ActivityStatus, DecisionKind, SourceKind } from "./types";
import type { Role } from "./auth";

export const fmtNum = (n: number | null | undefined, digits = 1) =>
  n == null ? "—" : n.toLocaleString("et-EE", { maximumFractionDigits: digits });

export const fmtValue = (n: number | null | undefined, unit: string) =>
  n == null ? "—" : `${fmtNum(n)} ${unit}`;

export function fmtDelta(n: number | null | undefined) {
  if (n == null) return "—";
  const r = Math.round(n * 10) / 10;
  return `${r > 0 ? "+" : r < 0 ? "−" : "±"}${fmtNum(Math.abs(r))}`;
}

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const s = typeof d === "string" ? d : d.toISOString();
  const [y, m, day] = s.slice(0, 10).split("-");
  return `${day}.${m}.${y}`;
}

export function fmtDateTime(d: Date | null | undefined) {
  if (!d) return "—";
  return d.toLocaleString("et-EE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Tallinn" });
}

/** Aasta 2027 = õppeaasta 2026/27. */
export const yearLabel = (y: number) => `${y - 1}/${String(y).slice(2)}`;

export const STATUS_LABEL: Record<Status, string> = {
  green: "Roheline",
  yellow: "Kollane",
  red: "Punane",
  gray: "Andmed puuduvad",
};

export const KIND_LABEL: Record<IndicatorKind, string> = {
  outcome: "Tulemusnäitaja",
  process: "Protsessinäitaja",
};

export const LEVEL_LABEL: Record<ImpactLevel, string> = {
  practice: "Praktika muutus",
  learner_reach: "Jõudis õppijani",
  learner_result: "Õppija tulemus / kogemus",
};

export const DIRECTION_LABEL: Record<TrendDirection, string> = {
  increase: "Kasv",
  decrease: "Langus",
  maintain: "Säilimine",
};

export const ACTIVITY_LABEL: Record<ActivityStatus, string> = {
  planned: "Planeeritud",
  in_progress: "Töös",
  done: "Tehtud",
  postponed: "Edasi lükatud",
  cancelled: "Loobutud",
};

export const DECISION_LABEL: Record<DecisionKind, string> = {
  continue: "Jätkame",
  change: "Muudame",
  stop: "Loobume",
  add: "Lisame",
  other: "Muu",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administraator / koolijuht",
  owner: "Arengusuuna vastutaja",
  viewer: "Vaatleja",
};

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  national: "Riiklik (HARNO)",
  program: "Programm (nt KiVa)",
  internal_test: "Koolisisene test",
  survey: "Küsitlus",
  observation: "Tunnivaatlus",
  register: "Register / õppeinfosüsteem",
  other: "Muu",
};

export const GAP_LABEL = {
  no_outcome_indicator: "Mõõdik puudub",
  no_baseline: "Algtase puudub",
  no_target: "Siht puudub",
  no_current_result: "Tulemus sisestamata",
} as const;

/** Tegevuse seisu nimetus sõltub tüübist: ühekordne tegevus valmib, praktika rakendub. */
export function activityStatusLabel(kind: "milestone" | "practice", status: ActivityStatus): string {
  if (status === "planned") return "Alustamata";
  if (status === "postponed") return "Edasi lükatud";
  if (status === "cancelled") return "Loobutud";
  if (kind === "practice") return status === "done" ? "Rakendunud" : "Rakendamisel";
  return status === "done" ? "Valmis" : "Töös";
}

export const ACTIVITY_KIND_LABEL = {
  milestone: "Ühekordne",
  practice: "Praktika juurutamine",
} as const;

/** Vastutaja nimi või arengukavas nimetatud roll ("Vastutaja: õppejuht." kirjelduses). */
export function responsibleLabel(ownerName: string | null, description: string | null): string {
  if (ownerName) return ownerName;
  const m = description?.match(/Vastutaja:\s*([^.]+)\./);
  return m ? m[1].trim() : "—";
}

export const MONTH_LABEL = [
  "jaanuar", "veebruar", "märts", "aprill", "mai", "juuni",
  "juuli", "august", "september", "oktoober", "november", "detsember",
];
