import type { ImpactLevel, IndicatorKind, TrendDirection } from "./status";
import type { Role } from "./auth";

export type ActivityStatus = "planned" | "in_progress" | "done" | "postponed" | "cancelled";
export type DecisionKind = "continue" | "change" | "stop" | "add" | "other";
export type SourceKind = "national" | "program" | "internal_test" | "survey" | "observation" | "register" | "other";

export interface Plan {
  id: string;
  schoolName: string;
  title: string;
  startYear: number;
  endYear: number;
  baselineYear: number;
}

export interface Direction {
  id: string;
  planId: string;
  position: number;
  code: string;
  title: string;
  startingPoint: string | null;
  desiredChange: string | null;
  learnerImpact: string | null;
}

export interface DirectionOwner {
  directionId: string;
  userId: string;
  isLead: boolean;
}

export interface Goal {
  id: string;
  directionId: string;
  position: number;
  code: string;
  title: string;
  desiredChange: string | null;
  learnerImpact: string | null;
}

export interface Indicator {
  id: string;
  goalId: string;
  code: string;
  name: string;
  kind: IndicatorKind;
  impactLevel: ImpactLevel;
  sourceId: string | null;
  unit: string;
  direction: TrendDirection;
  baselineValue: number | null;
  baselineYear: number | null;
  baselineNote: string | null;
  targetValue: number | null;
  targetYear: number;
  statusRuleId: string | null;
  isKey: boolean;
  ownerId: string | null;
  description: string | null;
  active: boolean;
}

export interface IndicatorResult {
  id: string;
  indicatorId: string;
  year: number;
  value: number;
  sourceId: string | null;
  measuredOn: string | null;
  sampleSize: number | null;
  comment: string | null;
  enteredBy: string | null;
  enteredAt: Date;
  updatedBy: string | null;
  updatedAt: Date | null;
}

export interface Activity {
  id: string;
  goalId: string;
  title: string;
  description: string | null;
  ownerId: string | null;
  year: number;
  startDate: string | null;
  dueDate: string | null;
  status: ActivityStatus;
  completedOn: string | null;
  outcomeNote: string | null;
}

export interface ActivityIndicator {
  activityId: string;
  indicatorId: string;
}

export interface StatusRuleRow {
  id: string;
  name: string;
  greenMinPct: number;
  yellowMinPct: number;
  redOnNegative: boolean;
  maintainTolerance: number;
  isDefault: boolean;
}

export interface DataSource {
  id: string;
  name: string;
  kind: SourceKind;
  note: string | null;
}

export interface Evidence {
  id: string;
  indicatorResultId: string | null;
  activityId: string | null;
  analysisId: string | null;
  title: string;
  url: string | null;
  storagePath: string | null;
  addedBy: string | null;
  addedAt: Date;
}

export interface Decision {
  id: string;
  directionId: string;
  goalId: string | null;
  indicatorId: string | null;
  activityId: string | null;
  analysisId: string | null;
  decidedOn: string;
  kind: DecisionKind;
  title: string;
  rationale: string | null;
  effectiveYear: number | null;
  ownerId: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface ImpactAnalysis {
  id: string;
  directionId: string;
  year: number;
  planned: string | null;
  done: string | null;
  practiceChange: string | null;
  learnerExperience: string | null;
  resultsChange: string | null;
  keepDoing: string | null;
  changeNext: string | null;
  stopDoing: string | null;
  status: "draft" | "approved";
  snapshot: AnalysisSnapshot | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
}

export interface AnalysisSnapshot {
  takenAt: string;
  year: number;
  directionStatus: string;
  directionStatusReason: string;
  indicators: {
    code: string;
    name: string;
    kind: string;
    unit: string;
    baselineValue: number | null;
    baselineYear: number | null;
    targetValue: number | null;
    value: number | null;
    previous: { year: number; value: number } | null;
    status: string;
    reason: string;
    source: string | null;
  }[];
  activities: { title: string; status: string; dueDate: string | null; completedOn: string | null }[];
}

export interface Profile {
  id: string;
  fullName: string;
  email: string | null;
  role: Role;
  isActive: boolean;
}

export interface DataGap {
  directionId: string;
  goalId: string;
  indicatorId: string | null;
  gapType: "no_outcome_indicator" | "no_baseline" | "no_target" | "no_current_result";
  message: string;
}
