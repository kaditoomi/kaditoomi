import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getCurrentUser } from "./auth";
import { asUser, type Tx } from "./db";
import { env } from "./env";
import { buildModel, type PlanModel, type RawData } from "./model";
import type { Plan } from "./types";

export const YEAR_COOKIE = "aasta";

async function loadRaw(tx: Tx, reportYear: number): Promise<RawData | null> {
  const [plan] = await tx<Plan[]>`select * from plans order by start_year limit 1`;
  if (!plan) return null;
  const [
    directions, owners, goals, indicators, results, activities, activityIndicators,
    rules, sources, evidence, decisions, analyses, profiles, gaps,
  ] = await Promise.all([
    tx`select * from directions where plan_id = ${plan.id} order by position`,
    tx`select * from direction_owners`,
    tx`select * from goals order by position`,
    tx`select * from indicators where active order by code`,
    tx`select * from indicator_results order by year`,
    tx`select * from activities order by due_date nulls last, title`,
    tx`select * from activity_indicators`,
    tx`select * from status_rules order by is_default desc, name`,
    tx`select * from data_sources order by name`,
    tx`select * from evidence order by added_at`,
    tx`select * from decisions order by decided_on desc, created_at desc`,
    tx`select * from impact_analyses order by year desc`,
    tx`select id, full_name, email, role from profiles order by full_name`,
    tx`select * from data_gaps(${reportYear})`,
  ]);
  return {
    plan, directions, owners, goals, indicators, results, activities, activityIndicators,
    rules, sources, evidence, decisions, analyses, profiles, gaps,
  } as unknown as RawData;
}

/** Tänane kuupäev (või demo jaoks ARUANDE_KUUPAEV) kujul YYYY-MM-DD. */
export function asOfDate(): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(env.reportDate)) return env.reportDate;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Vaikimisi aruandeaasta = viimati lõppenud õppeaasta (aasta 2027 = õppeaasta 2026/27).
 * Juulist alates loetakse jooksva kalendriaasta õppeaasta lõppenuks.
 */
export function defaultReportYear(plan: Plan, asOf: string): number {
  const [y, m] = asOf.split("-").map(Number);
  const ended = m >= 7 ? y : y - 1;
  return Math.min(plan.endYear, Math.max(plan.startYear, ended));
}

/** Mudel kindla aruandeaasta jaoks (nt mõjuanalüüsi kinnitamisel). */
export async function modelForYear(userId: string, year: number): Promise<PlanModel | null> {
  return asUser(userId, async (tx) => {
    const raw = await loadRaw(tx, year);
    return raw ? buildModel(raw, year, asOfDate()) : null;
  });
}

/** Kogu arengukava mudel sisselogitud kasutaja jaoks (RLS kehtib). */
export const loadPlanModel = cache(async (): Promise<PlanModel | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const asOf = asOfDate();
  const cookieYear = Number((await cookies()).get(YEAR_COOKIE)?.value);
  return asUser(user.id, async (tx) => {
    const [plan] = await tx<Plan[]>`select * from plans order by start_year limit 1`;
    if (!plan) return null;
    const reportYear =
      Number.isInteger(cookieYear) && cookieYear >= plan.startYear && cookieYear <= plan.endYear
        ? cookieYear
        : defaultReportYear(plan, asOf);
    const raw = await loadRaw(tx, reportYear);
    return raw ? buildModel(raw, reportYear, asOf) : null;
  });
});
