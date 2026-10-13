"use server";

// Kõik arengukava andmete muutmised. Õigused jõustab andmebaas (RLS):
// vastutaja saab muuta ainult oma arengusuuna andmeid, vaatleja mitte midagi.

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  UserError,
  expectRows,
  fBool,
  fDate,
  fInt,
  fNumber,
  fRequired,
  fText,
  fUrl,
  fUuid,
  fUuidOrNull,
  mutate,
  parseForm,
  type ActionState,
} from "@/lib/action-utils";
import { requireUser } from "@/lib/auth";
import { modelForYear } from "@/lib/data";
import { yearLabel } from "@/lib/format";
import { snapshotFor } from "@/lib/model";

// ---------------------------------------------------------------- arengusuund

const directionShape = {
  title: fRequired,
  startingPoint: fText,
  desiredChange: fText,
  learnerImpact: fText,
};

export async function updateDirection(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx) => {
    const id = fUuid.parse(fd.get("id"));
    const d = parseForm(directionShape, fd);
    expectRows(await tx`update directions set ${tx(d)} where id = ${id}`);
  });
}

export async function createDirection(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx) => {
    const d = parseForm({ ...directionShape, code: fRequired }, fd);
    const [plan] = await tx<{ id: string }[]>`select id from plans order by start_year limit 1`;
    if (!plan) throw new UserError("Arengukava puudub");
    const [{ next }] = await tx<{ next: number }[]>`
      select coalesce(max(position), 0) + 1 as next from directions where plan_id = ${plan.id}`;
    await tx`insert into directions ${tx({ ...d, planId: plan.id, position: next })}`;
    return "Arengusuund lisatud";
  });
}

export async function setDirectionOwners(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx) => {
    const directionId = fUuid.parse(fd.get("directionId"));
    const userIds = z.array(fUuid).parse(fd.getAll("userId"));
    const lead = fUuidOrNull.parse(fd.get("leadId"));
    await tx`delete from direction_owners where direction_id = ${directionId}`;
    for (const userId of userIds) {
      await tx`insert into direction_owners ${tx({ directionId, userId, isLead: userId === lead })}`;
    }
    // Vastutajaks määratud vaatleja saab vastutaja rolli.
    if (userIds.length) {
      await tx`update profiles set role = 'owner' where id in ${tx(userIds)} and role = 'viewer'`;
    }
    return "Vastutajad salvestatud";
  });
}

// ---------------------------------------------------------------- eesmärk

const goalShape = { code: fRequired, title: fRequired, desiredChange: fText, learnerImpact: fText };

export async function createGoal(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx) => {
    const directionId = fUuid.parse(fd.get("directionId"));
    const g = parseForm(goalShape, fd);
    const [{ next }] = await tx<{ next: number }[]>`
      select coalesce(max(position), 0) + 1 as next from goals where direction_id = ${directionId}`;
    await tx`insert into goals ${tx({ ...g, directionId, position: next })}`;
    return "Eesmärk lisatud";
  });
}

export async function updateGoal(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx) => {
    const id = fUuid.parse(fd.get("id"));
    const g = parseForm(goalShape, fd);
    expectRows(await tx`update goals set ${tx(g)} where id = ${id}`);
  });
}

// ---------------------------------------------------------------- mõõdik

const indicatorShape = {
  code: fRequired,
  name: fRequired,
  kind: z.enum(["outcome", "process"]),
  impactLevel: z.enum(["practice", "learner_reach", "learner_result"]),
  sourceId: fUuidOrNull,
  unit: fRequired,
  direction: z.enum(["increase", "decrease", "maintain"]),
  baselineValue: fNumber,
  baselineYear: fInt,
  baselineNote: fText,
  targetValue: fNumber,
  targetYear: fInt.pipe(z.number().int().nullable()),
  statusRuleId: fUuidOrNull,
  isKey: fBool,
  ownerId: fUuidOrNull,
  description: fText,
};

function checkIndicator(i: z.infer<z.ZodObject<typeof indicatorShape>>) {
  if (i.baselineValue != null && i.baselineYear == null) throw new UserError("Algtasemel peab olema aasta");
  if (i.baselineValue == null) i.baselineYear = null;
  return { ...i, targetYear: i.targetYear ?? 2030 };
}

export async function createIndicator(_p: ActionState, fd: FormData): Promise<ActionState> {
  const goalId = fUuid.safeParse(fd.get("goalId"));
  let newId: string | null = null;
  const res = await mutate(async (tx) => {
    if (!goalId.success) throw new UserError("Eesmärk puudub");
    const i = checkIndicator(parseForm(indicatorShape, fd));
    const [row] = await tx<{ id: string }[]>`insert into indicators ${tx({ ...i, goalId: goalId.data })} returning id`;
    newId = row.id;
  });
  if (newId) redirect(`/moodikud/${newId}`);
  return res;
}

export async function updateIndicator(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx) => {
    const id = fUuid.parse(fd.get("id"));
    const i = checkIndicator(parseForm(indicatorShape, fd));
    expectRows(await tx`update indicators set ${tx(i)} where id = ${id}`);
  });
}

export async function archiveIndicator(_p: ActionState, fd: FormData): Promise<ActionState> {
  let back: string | null = null;
  const res = await mutate(async (tx) => {
    const id = fUuid.parse(fd.get("id"));
    const [row] = await tx<{ code: string }[]>`
      update indicators set active = false where id = ${id}
      returning (select d.code from goals g join directions d on d.id = g.direction_id where g.id = goal_id) as code`;
    if (!row) throw new UserError("Puudub õigus seda mõõdikut muuta");
    back = `/suunad/${row.code}`;
  });
  if (back) redirect(back);
  return res;
}

// ---------------------------------------------------------------- tulemused

const resultShape = {
  year: fInt.pipe(z.number().int().min(2000).max(2100)),
  value: fNumber.pipe(z.number({ error: "väärtus on kohustuslik" })),
  sourceId: fUuidOrNull,
  measuredOn: fDate,
  sampleSize: fInt,
  comment: fText,
};

export async function saveResult(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx) => {
    const indicatorId = fUuid.parse(fd.get("indicatorId"));
    const r = parseForm(resultShape, fd);
    const ev = parseForm({ evidenceTitle: fText, evidenceUrl: fUrl }, fd);
    const [row] = await tx<{ id: string }[]>`
      insert into indicator_results ${tx({ ...r, indicatorId })}
      on conflict (indicator_id, year) do update set
        value = excluded.value, source_id = excluded.source_id, measured_on = excluded.measured_on,
        sample_size = excluded.sample_size, comment = excluded.comment
      returning id`;
    if (ev.evidenceUrl) {
      await tx`insert into evidence ${tx({
        indicatorResultId: row.id,
        title: ev.evidenceTitle ?? "Tõend",
        url: ev.evidenceUrl,
      })}`;
    }
    return `Õppeaasta ${yearLabel(r.year)} tulemus salvestatud`;
  });
}

export async function deleteResult(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx) => {
    const id = fUuid.parse(fd.get("id"));
    expectRows(await tx`delete from indicator_results where id = ${id}`);
    return "Tulemus kustutatud";
  });
}

// ---------------------------------------------------------------- tõendid

export async function addEvidence(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx) => {
    const e = parseForm(
      {
        indicatorResultId: fUuidOrNull,
        activityId: fUuidOrNull,
        analysisId: fUuidOrNull,
        title: fRequired,
        url: fUrl.pipe(z.string({ error: "link on kohustuslik" })),
      },
      fd,
    );
    await tx`insert into evidence ${tx(e)}`;
    return "Tõend lisatud";
  });
}

export async function deleteEvidence(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx) => {
    const id = fUuid.parse(fd.get("id"));
    expectRows(await tx`delete from evidence where id = ${id}`);
    return "Tõend eemaldatud";
  });
}

// ---------------------------------------------------------------- tegevused

const activityShape = {
  title: fRequired,
  description: fText,
  ownerId: fUuidOrNull,
  year: fInt.pipe(z.number().int().min(2000).max(2100)),
  startDate: fDate,
  dueDate: fDate,
  status: z.enum(["planned", "in_progress", "done", "postponed", "cancelled"]),
  completedOn: fDate,
  outcomeNote: fText,
};

function checkActivity(a: z.infer<z.ZodObject<typeof activityShape>>) {
  if (a.status === "done" && !a.completedOn) throw new UserError("Tehtud tegevusel peab olema toimumise kuupäev");
  if (a.status !== "done") a.completedOn = null;
  return a;
}

async function linkIndicators(tx: import("@/lib/db").Tx, activityId: string, fd: FormData) {
  const ids = z.array(fUuid).parse(fd.getAll("indicatorId"));
  await tx`delete from activity_indicators where activity_id = ${activityId}`;
  for (const indicatorId of ids) await tx`insert into activity_indicators ${tx({ activityId, indicatorId })}`;
}

export async function createActivity(_p: ActionState, fd: FormData): Promise<ActionState> {
  let back: string | null = null;
  const res = await mutate(async (tx) => {
    const goalId = fUuid.parse(fd.get("goalId"));
    const a = checkActivity(parseForm(activityShape, fd));
    const [row] = await tx<{ id: string; code: string }[]>`
      insert into activities ${tx({ ...a, goalId })}
      returning id, (select d.code from goals g join directions d on d.id = g.direction_id where g.id = goal_id) as code`;
    await linkIndicators(tx, row.id, fd);
    back = `/suunad/${row.code}#tegevused`;
  });
  if (back) redirect(back);
  return res;
}

export async function updateActivity(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx) => {
    const id = fUuid.parse(fd.get("id"));
    const a = checkActivity(parseForm(activityShape, fd));
    expectRows(await tx`update activities set ${tx(a)} where id = ${id}`);
    await linkIndicators(tx, id, fd);
  });
}

export async function deleteActivity(_p: ActionState, fd: FormData): Promise<ActionState> {
  let back: string | null = null;
  const res = await mutate(async (tx) => {
    const id = fUuid.parse(fd.get("id"));
    const [row] = await tx<{ code: string }[]>`
      delete from activities where id = ${id}
      returning (select d.code from goals g join directions d on d.id = g.direction_id where g.id = goal_id) as code`;
    if (!row) throw new UserError("Puudub õigus seda tegevust kustutada");
    back = `/suunad/${row.code}#tegevused`;
  });
  if (back) redirect(back);
  return res;
}

// ---------------------------------------------------------------- juhtimisotsused

export async function createDecision(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx, user) => {
    const d = parseForm(
      {
        directionId: fUuid,
        goalId: fUuidOrNull,
        indicatorId: fUuidOrNull,
        activityId: fUuidOrNull,
        analysisId: fUuidOrNull,
        decidedOn: fDate.pipe(z.string({ error: "kuupäev on kohustuslik" })),
        kind: z.enum(["continue", "change", "stop", "add", "other"]),
        title: fRequired,
        rationale: fText,
        effectiveYear: fInt,
        ownerId: fUuidOrNull,
      },
      fd,
    );
    await tx`insert into decisions ${tx({ ...d, createdBy: user.id })}`;
    return "Otsus lisatud";
  });
}

export async function deleteDecision(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx) => {
    const id = fUuid.parse(fd.get("id"));
    expectRows(await tx`delete from decisions where id = ${id}`);
    return "Otsus kustutatud";
  });
}

// ---------------------------------------------------------------- mõjuanalüüs

const analysisShape = {
  planned: fText,
  done: fText,
  practiceChange: fText,
  learnerExperience: fText,
  resultsChange: fText,
  keepDoing: fText,
  changeNext: fText,
  stopDoing: fText,
};

export async function saveAnalysis(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx, user) => {
    const directionId = fUuid.parse(fd.get("directionId"));
    const year = fInt.pipe(z.number().int()).parse(fd.get("year"));
    const a = parseForm(analysisShape, fd);
    const [existing] = await tx<{ status: string }[]>`
      select status from impact_analyses where direction_id = ${directionId} and year = ${year}`;
    if (existing?.status === "approved") throw new UserError("Kinnitatud analüüsi ei saa muuta");
    if (existing) {
      expectRows(await tx`update impact_analyses set ${tx(a)} where direction_id = ${directionId} and year = ${year}`);
    } else {
      await tx`insert into impact_analyses ${tx({ ...a, directionId, year, createdBy: user.id })}`;
    }
    return "Mustand salvestatud";
  });
}

export async function approveAnalysis(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const directionId = fUuid.safeParse(fd.get("directionId"));
  const year = Number(fd.get("year"));
  if (!directionId.success || !Number.isInteger(year)) return { error: "Vigased andmed" };
  if (user.role !== "admin") return { error: "Analüüsi kinnitab koolijuht" };
  // Hetktõmmis arvutatakse sama aasta kohta, mida analüüs käsitleb.
  const model = await modelForYear(user.id, year);
  const dir = model?.directions.find((d) => d.id === directionId.data);
  if (!model || !dir) return { error: "Arengusuunda ei leitud" };
  const snapshot = snapshotFor(model, dir, year);
  return mutate(async (tx) => {
    const res = await tx`
      update impact_analyses set status = 'approved', snapshot = ${tx.json(JSON.parse(JSON.stringify(snapshot)))},
        approved_by = ${user.id}, approved_at = now()
      where direction_id = ${directionId.data} and year = ${year} and status = 'draft'`;
    expectRows(res, "Salvesta enne kinnitamist mustand");
    return "Mõjuanalüüs kinnitatud ja lukustatud";
  });
}

export async function reopenAnalysis(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx, user) => {
    if (user.role !== "admin") throw new UserError("Ainult koolijuht saab kinnitatud analüüsi avada");
    const id = fUuid.parse(fd.get("id"));
    expectRows(
      await tx`update impact_analyses set status = 'draft', approved_at = null, approved_by = null, snapshot = null
               where id = ${id}`,
    );
    return "Analüüs avatud muutmiseks";
  });
}

// ---------------------------------------------------------------- seaded (admin)

export async function updateProfile(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx, user) => {
    const p = parseForm(
      { id: fUuid, fullName: fRequired, role: z.enum(["admin", "owner", "viewer"]), isActive: fBool },
      fd,
    );
    if (p.id === user.id && (p.role !== "admin" || !p.isActive)) {
      throw new UserError("Enda administraatoriõigust ei saa eemaldada ega oma kontot peatada");
    }
    expectRows(
      await tx`update profiles set full_name = ${p.fullName}, role = ${p.role}, is_active = ${p.isActive} where id = ${p.id}`,
    );
  });
}

export async function createSource(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx) => {
    const s = parseForm(
      {
        name: fRequired,
        kind: z.enum(["national", "program", "internal_test", "survey", "observation", "register", "other"]),
        note: fText,
      },
      fd,
    );
    await tx`insert into data_sources ${tx(s)}`;
    return "Andmeallikas lisatud";
  });
}

const ruleShape = {
  name: fRequired,
  greenMinPct: fNumber.pipe(z.number().min(0).max(1000)),
  yellowMinPct: fNumber.pipe(z.number().min(0).max(1000)),
  redOnNegative: fBool,
  maintainTolerance: fNumber.pipe(z.number().min(0)),
};

function checkRule(r: z.infer<z.ZodObject<typeof ruleShape>>) {
  if (r.greenMinPct <= r.yellowMinPct) throw new UserError("Rohelise piir peab olema suurem kui kollase piir");
  return r;
}

export async function saveRule(_p: ActionState, fd: FormData): Promise<ActionState> {
  return mutate(async (tx) => {
    const id = fUuidOrNull.parse(fd.get("id"));
    const r = checkRule(parseForm(ruleShape, fd));
    if (id) expectRows(await tx`update status_rules set ${tx(r)} where id = ${id}`);
    else await tx`insert into status_rules ${tx(r)}`;
    return "Staatusereegel salvestatud";
  });
}
