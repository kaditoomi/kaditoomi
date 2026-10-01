import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, type CurrentUser } from "./auth";
import { asUser, type Tx } from "./db";

export type ActionState = { error?: string; ok?: string } | null;

export class UserError extends Error {}

/** UPDATE/DELETE, mis ei puudutanud ühtegi rida = RLS keelas (või kirjet pole). */
export function expectRows(res: { count: number }, msg = "Puudub õigus seda kirjet muuta") {
  if (res.count === 0) throw new UserError(msg);
}

const FIELD_LABELS: Record<string, string> = {
  value: "Väärtus",
  year: "Aasta",
  code: "Kood",
  name: "Nimetus",
  title: "Pealkiri",
  unit: "Ühik",
  baselineValue: "Algtase",
  baselineYear: "Algtaseme aasta",
  targetValue: "Sihttase",
  targetYear: "Sihi aasta",
  sampleSize: "Valimi suurus",
  measuredOn: "Mõõtmise kuupäev",
  dueDate: "Tähtaeg",
  startDate: "Algus",
  completedOn: "Toimumise kuupäev",
  decidedOn: "Kuupäev",
  url: "Link",
  evidenceUrl: "Tõendi link",
  greenMinPct: "Rohelise piir",
  yellowMinPct: "Kollase piir",
  maintainTolerance: "Tolerants",
  fullName: "Nimi",
};

function translate(e: unknown): string {
  if (e instanceof UserError) return e.message;
  if (e instanceof z.ZodError) {
    const i = e.issues[0];
    const field = String(i?.path[0] ?? "");
    return i ? `${FIELD_LABELS[field] ?? (field || "Väli")}: ${i.message}` : "Vigased andmed";
  }
  const err = e as { code?: string; message?: string; constraint_name?: string };
  if (err?.code === "42501" || /row-level security/.test(err?.message ?? "")) return "Puudub õigus seda muuta";
  if (err?.code === "23505") return "Selline kirje on juba olemas (nt sama aasta tulemus või kood)";
  if (err?.code === "23514") return "Andmed ei vasta reeglitele (nt tehtud tegevusel peab olema kuupäev)";
  if (err?.code === "23503") return "Seotud kirjet ei leitud";
  console.error(e);
  return "Salvestamine ebaõnnestus";
}

/** Käivitab kirjutamise kasutaja nimel (RLS kehtib), tõlgib vead ja värskendab lehti. */
export async function mutate(
  fn: (tx: Tx, user: CurrentUser) => Promise<string | void>,
): Promise<ActionState> {
  const user = await requireUser();
  try {
    const ok = await asUser(user.id, (tx) => fn(tx, user));
    revalidatePath("/", "layout");
    return { ok: ok || "Salvestatud" };
  } catch (e) {
    return { error: translate(e) };
  }
}

// ---------- Vormiväljade parsimine ----------
const blankToNull = (v: unknown) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v);

export const fText = z.preprocess(blankToNull, z.string().trim().nullable());
export const fRequired = z.string().trim().min(1, "kohustuslik");
export const fNumber = z.preprocess(
  (v) => {
    const b = blankToNull(v);
    return typeof b === "string" ? Number(b.replace(/\s/g, "").replace(",", ".")) : b;
  },
  z.number({ error: "peab olema arv" }).finite().nullable(),
);
export const fInt = z.preprocess(
  (v) => {
    const b = blankToNull(v);
    return typeof b === "string" ? Number(b) : b;
  },
  z.number({ error: "peab olema täisarv" }).int().nullable(),
);
export const fDate = z.preprocess(blankToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "kuupäev").nullable());
export const fBool = z.preprocess((v) => v === "on" || v === "true" || v === "1", z.boolean());
export const fUuid = z.guid("vigane id");
export const fUuidOrNull = z.preprocess(blankToNull, z.guid("vigane id").nullable());
export const fUrl = z.preprocess(
  blankToNull,
  z.string().url("peab olema link (https://…)").refine((u) => /^https?:\/\//.test(u), "peab algama http(s)://").nullable(),
);

export function parseForm<T extends z.ZodRawShape>(shape: T, fd: FormData) {
  const obj: Record<string, unknown> = {};
  for (const key of Object.keys(shape)) obj[key] = fd.get(key) ?? undefined;
  return z.object(shape).parse(obj);
}
