// Seob toorandmed mõjuahelaks ja arvutab staatused. Puhas funktsioon (testitav).
import {
  DEFAULT_RULE,
  byUrgency,
  chainBreak,
  directionStatus,
  evaluateIndicator,
  type Evaluation,
  type Status,
  type StatusRule,
} from "./status";
import type {
  Activity,
  ActivityIndicator,
  AnalysisSnapshot,
  DataGap,
  DataSource,
  Decision,
  Direction,
  DirectionOwner,
  Evidence,
  Goal,
  ImpactAnalysis,
  Indicator,
  IndicatorResult,
  Plan,
  Profile,
  StatusRuleRow,
} from "./types";

export interface RawData {
  plan: Plan;
  directions: Direction[];
  owners: DirectionOwner[];
  goals: Goal[];
  indicators: Indicator[];
  results: IndicatorResult[];
  activities: Activity[];
  activityIndicators: ActivityIndicator[];
  rules: StatusRuleRow[];
  sources: DataSource[];
  evidence: Evidence[];
  decisions: Decision[];
  analyses: ImpactAnalysis[];
  profiles: Profile[];
  gaps: DataGap[];
}

export interface IndicatorView extends Indicator {
  directionId: string;
  goal: Goal;
  evaluation: Evaluation;
  rule: StatusRuleRow | null;
  source: DataSource | null;
  results: IndicatorResult[];
  activities: ActivityView[];
}

export interface ActivityView extends Activity {
  directionId: string;
  goal: Goal;
  overdue: boolean;
  indicatorIds: string[];
}

export interface GoalView extends Goal {
  indicators: IndicatorView[];
  activities: ActivityView[];
  chainBreak: boolean;
}

export interface LevelSummary {
  activities: { total: number; done: number; overdue: number; postponed: number };
  practice: IndicatorView[];
  learnerReach: IndicatorView[];
  learnerResult: IndicatorView[];
}

export interface DirectionView extends Direction {
  owners: (DirectionOwner & { fullName: string })[];
  goals: GoalView[];
  indicators: IndicatorView[];
  activities: ActivityView[];
  status: Status;
  statusReason: string;
  levels: LevelSummary;
  keyIndicators: IndicatorView[];
  chainBreakGoals: GoalView[];
  decisions: Decision[];
  analyses: ImpactAnalysis[];
  gaps: DataGap[];
}

export interface PlanModel {
  plan: Plan;
  reportYear: number;
  asOf: string;
  years: number[];
  directions: DirectionView[];
  indicators: IndicatorView[];
  activities: ActivityView[];
  rules: StatusRuleRow[];
  sources: DataSource[];
  profiles: Profile[];
  evidence: Evidence[];
  decisions: Decision[];
  gaps: DataGap[];
  attention: IndicatorView[];
  overdue: ActivityView[];
}

export const toRule = (r: StatusRuleRow | null): StatusRule =>
  r
    ? {
        greenMinPct: r.greenMinPct,
        yellowMinPct: r.yellowMinPct,
        redOnNegative: r.redOnNegative,
        maintainTolerance: r.maintainTolerance,
      }
    : DEFAULT_RULE;

export function buildModel(raw: RawData, reportYear: number, asOf: string): PlanModel {
  const goalById = new Map(raw.goals.map((g) => [g.id, g]));
  const ruleById = new Map(raw.rules.map((r) => [r.id, r]));
  const defaultRule = raw.rules.find((r) => r.isDefault) ?? null;
  const sourceById = new Map(raw.sources.map((s) => [s.id, s]));
  const profileById = new Map(raw.profiles.map((p) => [p.id, p]));

  const activities: ActivityView[] = raw.activities
    .filter((a) => goalById.has(a.goalId))
    .map((a) => {
      const goal = goalById.get(a.goalId)!;
      return {
        ...a,
        goal,
        directionId: goal.directionId,
        overdue:
          (a.status === "planned" || a.status === "in_progress") && a.dueDate != null && a.dueDate < asOf,
        indicatorIds: raw.activityIndicators.filter((x) => x.activityId === a.id).map((x) => x.indicatorId),
      };
    });

  const indicators: IndicatorView[] = raw.indicators
    .filter((i) => goalById.has(i.goalId))
    .map((i) => {
      const goal = goalById.get(i.goalId)!;
      const rule = (i.statusRuleId ? ruleById.get(i.statusRuleId) : null) ?? defaultRule;
      const results = raw.results.filter((r) => r.indicatorId === i.id).sort((a, b) => a.year - b.year);
      const evaluation = evaluateIndicator(
        {
          direction: i.direction,
          baselineValue: i.baselineValue,
          baselineYear: i.baselineYear,
          targetValue: i.targetValue,
          targetYear: i.targetYear,
          results: results.map((r) => ({ year: r.year, value: r.value })),
        },
        toRule(rule),
        reportYear,
      );
      return {
        ...i,
        goal,
        directionId: goal.directionId,
        evaluation,
        rule,
        source: i.sourceId ? sourceById.get(i.sourceId) ?? null : null,
        results,
        activities: activities.filter((a) => a.indicatorIds.includes(i.id)),
      };
    });

  const directions: DirectionView[] = raw.directions.map((d) => {
    const goals: GoalView[] = raw.goals
      .filter((g) => g.directionId === d.id)
      .map((g) => {
        const gi = indicators.filter((i) => i.goalId === g.id);
        return {
          ...g,
          indicators: gi,
          activities: activities.filter((a) => a.goalId === g.id),
          chainBreak: chainBreak(gi.map((i) => ({ status: i.evaluation.status, impactLevel: i.impactLevel }))),
        };
      });
    const dInd = indicators.filter((i) => i.directionId === d.id);
    const dAct = activities.filter((a) => a.directionId === d.id);
    const yearActs = dAct.filter((a) => a.year === reportYear && a.status !== "cancelled");
    const outcomes = dInd.filter((i) => i.kind === "outcome");
    const overall = directionStatus(outcomes.map((i) => ({ status: i.evaluation.status, isKey: i.isKey })));
    const sortLevel = (xs: IndicatorView[]) =>
      [...xs].sort((a, b) => byUrgency(a.evaluation.status, b.evaluation.status));
    return {
      ...d,
      owners: raw.owners
        .filter((o) => o.directionId === d.id)
        .map((o) => ({ ...o, fullName: profileById.get(o.userId)?.fullName ?? "—" }))
        .sort((a, b) => Number(b.isLead) - Number(a.isLead)),
      goals,
      indicators: dInd,
      activities: dAct,
      status: overall.status,
      statusReason: overall.reason,
      levels: {
        activities: {
          total: yearActs.length,
          done: yearActs.filter((a) => a.status === "done").length,
          overdue: dAct.filter((a) => a.overdue).length,
          postponed: yearActs.filter((a) => a.status === "postponed").length,
        },
        practice: sortLevel(dInd.filter((i) => i.impactLevel === "practice")),
        learnerReach: sortLevel(dInd.filter((i) => i.impactLevel === "learner_reach")),
        learnerResult: sortLevel(dInd.filter((i) => i.impactLevel === "learner_result")),
      },
      keyIndicators: outcomes.filter((i) => i.isKey),
      chainBreakGoals: goals.filter((g) => g.chainBreak),
      decisions: raw.decisions.filter((x) => x.directionId === d.id),
      analyses: raw.analyses.filter((a) => a.directionId === d.id).sort((a, b) => b.year - a.year),
      gaps: raw.gaps.filter((g) => g.directionId === d.id),
    };
  });

  const attention = indicators
    .filter((i) => i.evaluation.status === "red" || i.evaluation.status === "yellow")
    .sort(
      (a, b) =>
        byUrgency(a.evaluation.status, b.evaluation.status) ||
        Number(b.isKey) - Number(a.isKey) ||
        (a.kind === b.kind ? 0 : a.kind === "outcome" ? -1 : 1) ||
        a.code.localeCompare(b.code),
    );

  const years: number[] = [];
  for (let y = raw.plan.startYear; y <= raw.plan.endYear; y++) years.push(y);

  return {
    plan: raw.plan,
    reportYear,
    asOf,
    years,
    directions,
    indicators,
    activities,
    rules: raw.rules,
    sources: raw.sources,
    profiles: raw.profiles,
    evidence: raw.evidence,
    decisions: raw.decisions,
    gaps: raw.gaps,
    attention,
    overdue: activities.filter((a) => a.overdue).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "")),
  };
}

/** Mõjuanalüüsi kinnitamise hetktõmmis (jääb ajalukku muutumatuna). */
export function snapshotFor(model: PlanModel, d: DirectionView, year: number): AnalysisSnapshot {
  return {
    takenAt: new Date().toISOString(),
    year,
    directionStatus: d.status,
    directionStatusReason: d.statusReason,
    indicators: d.indicators.map((i) => ({
      code: i.code,
      name: i.name,
      kind: i.kind,
      unit: i.unit,
      baselineValue: i.baselineValue,
      baselineYear: i.baselineYear,
      targetValue: i.targetValue,
      value: i.evaluation.value,
      previous: i.evaluation.previous,
      status: i.evaluation.status,
      reason: i.evaluation.reason,
      source: i.source?.name ?? null,
    })),
    activities: d.activities
      .filter((a) => a.year === year)
      .map((a) => ({ title: a.title, status: a.status, dueDate: a.dueDate, completedOn: a.completedOn })),
  };
}
