import Link from "next/link";
import { notFound } from "next/navigation";
import { approveAnalysis, reopenAnalysis, saveAnalysis } from "@/app/actions/plan";
import { ActionForm, SubmitButton } from "@/components/forms";
import { StatusBadge, StatusDot } from "@/components/status";
import { canEditDirection, requireUser } from "@/lib/auth";
import { loadPlanModel, modelForYear } from "@/lib/data";
import { ACTIVITY_LABEL, DECISION_LABEL, fmtDate, fmtDateTime, fmtNum, yearLabel } from "@/lib/format";
import type { Status } from "@/lib/status";
import type { ImpactAnalysis } from "@/lib/types";

const QUESTIONS: { key: keyof ImpactAnalysis; label: string; hint: string }[] = [
  { key: "planned", label: "1. Mida kavandasime?", hint: "Selle aasta tegevuskava selle suuna kohta." },
  { key: "done", label: "2. Mida tegime?", hint: "Mis tegelikult toimus, mis jäi tegemata ja miks." },
  { key: "practiceChange", label: "3. Mis praktikas muutus?", hint: "Õpetaja/kooli praktika — protsessinäitajad, vaatlused." },
  { key: "learnerExperience", label: "4. Mida õppija koges teisiti?", hint: "Küsitlused, õpilaste tagasiside, jõudis õppijani." },
  { key: "resultsChange", label: "5. Millised tulemused muutusid?", hint: "Tulemusnäitajad: algtase → tulemus, staatus." },
  { key: "keepDoing", label: "6. Mida jätkame?", hint: "" },
  { key: "changeNext", label: "7. Mida muudame?", hint: "Muutused järgmise aasta tegevuskavas." },
  { key: "stopDoing", label: "8. Millest loobume?", hint: "Tegevused, millel puudus seos soovitud muutusega." },
];

export default async function AnalysisPage({ params }: { params: Promise<{ code: string; aasta: string }> }) {
  const { code, aasta } = await params;
  const year = Number(aasta);
  const user = await requireUser();
  const base = await loadPlanModel();
  if (!base || !Number.isInteger(year) || year < base.plan.startYear || year > base.plan.endYear) notFound();
  // Abiinfo arvutatakse analüüsitava aasta kohta, mitte valitud aruandeaasta kohta.
  const model = year === base.reportYear ? base : await modelForYear(user.id, year);
  const d = model?.directions.find((x) => x.code === decodeURIComponent(code));
  if (!model || !d) notFound();
  const analysis = d.analyses.find((a) => a.year === year);
  const approved = analysis?.status === "approved";
  const canEdit = canEditDirection(user, d.id) && !approved;
  const isAdmin = user.role === "admin";
  const yearActs = d.activities.filter((a) => a.year === year);
  const prev = d.analyses.find((a) => a.year === year - 1);
  const decisions = d.decisions.filter((x) => x.decidedOn.startsWith(String(year)) || x.analysisId === analysis?.id);
  const name = (id: string | null) => model.profiles.find((p) => p.id === id)?.fullName ?? "—";

  const defaults: Partial<Record<keyof ImpactAnalysis, string>> = analysis
    ? {}
    : {
        planned: yearActs.map((a) => `• ${a.title}`).join("\n"),
        done: yearActs
          .map((a) => `• ${a.title} — ${ACTIVITY_LABEL[a.status].toLowerCase()}${a.outcomeNote ? ` (${a.outcomeNote})` : ""}`)
          .join("\n"),
      };

  return (
    <div className="space-y-5">
      <Link href={`/suunad/${d.code}`} className="text-sm text-ink-3 hover:underline">
        ← {d.code} {d.title}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">
          {d.code} · Mõjuanalüüs {yearLabel(year)}
        </h1>
        <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-ink-2">
          {approved ? "KINNITATUD" : analysis ? "MUSTAND" : "ALUSTAMATA"}
        </span>
      </div>
      {approved && (
        <p className="text-sm text-ink-2">
          Kinnitas {name(analysis.approvedBy)} {fmtDateTime(analysis.approvedAt)}. Analüüs on lukus; allpool on näitajad
          kinnitamise hetke seisuga.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="card p-4">
          {approved ? (
            <dl className="space-y-4">
              {QUESTIONS.map((q) => (
                <div key={q.key}>
                  <dt className="text-sm font-semibold">{q.label}</dt>
                  <dd className="mt-1 whitespace-pre-line text-sm text-ink-2">{(analysis[q.key] as string | null) || "—"}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <ActionForm action={saveAnalysis} className="space-y-4">
              <input type="hidden" name="directionId" value={d.id} />
              <input type="hidden" name="year" value={year} />
              {QUESTIONS.map((q) => (
                <label key={q.key} className="block">
                  <span className="text-sm font-semibold">{q.label}</span>
                  {q.hint && <span className="block text-xs text-ink-3">{q.hint}</span>}
                  <textarea
                    name={q.key}
                    rows={3}
                    disabled={!canEdit}
                    defaultValue={(analysis?.[q.key] as string | null) ?? defaults[q.key] ?? ""}
                    className="input mt-1"
                  />
                </label>
              ))}
              {canEdit ? (
                <div className="flex items-center gap-3">
                  <SubmitButton>Salvesta mustand</SubmitButton>
                  {!isAdmin && <span className="text-xs text-ink-3">Mustandi kinnitab koolijuht.</span>}
                </div>
              ) : (
                <p className="text-sm text-ink-3">Sul on selle analüüsi kohta lugemisõigus.</p>
              )}
            </ActionForm>
          )}

          {isAdmin && analysis && !approved && (
            <ActionForm
              action={approveAnalysis}
              className="mt-4 border-t border-line pt-4"
              confirm="Kinnitada analüüs? Kinnitamisel salvestatakse näitajate hetkeseis ja analüüs lukustub."
            >
              <input type="hidden" name="directionId" value={d.id} />
              <input type="hidden" name="year" value={year} />
              <p className="mb-2 text-xs text-ink-3">Salvesta enne kinnitamist muudatused mustandina.</p>
              <SubmitButton>Kinnita ja lukusta</SubmitButton>
            </ActionForm>
          )}
          {isAdmin && approved && (
            <ActionForm action={reopenAnalysis} className="mt-4 border-t border-line pt-4" confirm="Avada kinnitatud analüüs muutmiseks?">
              <input type="hidden" name="id" value={analysis.id} />
              <SubmitButton variant="default">Ava muutmiseks</SubmitButton>
            </ActionForm>
          )}
        </section>

        <aside className="space-y-4">
          <div className="card p-4 text-sm">
            <p className="h-section mb-2">{approved ? "Kinnitamise hetke seis" : "Abiinfo (automaatne)"}</p>
            <div className="flex items-center gap-2">
              <StatusBadge status={(approved ? analysis.snapshot?.directionStatus : d.status) as Status} />
              <span className="text-xs text-ink-3">{approved ? analysis.snapshot?.directionStatusReason : d.statusReason}</span>
            </div>
            <p className="mt-3 text-xs font-medium text-ink-2">
              Tegevused {yearLabel(year)}:{" "}
              {approved
                ? `${analysis.snapshot?.activities.filter((a) => a.status === "done").length ?? 0}/${analysis.snapshot?.activities.length ?? 0} tehtud`
                : `${yearActs.filter((a) => a.status === "done").length}/${yearActs.filter((a) => a.status !== "cancelled").length} tehtud`}
            </p>
            {!approved && (
              <ul className="mt-1 space-y-0.5 text-xs">
                {yearActs.map((a) => (
                  <li key={a.id}>
                    {a.overdue ? "⚠" : a.status === "done" ? "✓" : "○"} {a.title}{" "}
                    <span className="text-ink-3">({a.overdue ? "tähtaeg ületatud" : ACTIVITY_LABEL[a.status].toLowerCase()})</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs font-medium text-ink-2">Mõõdikud (eelmine → {yearLabel(year)})</p>
            <ul className="mt-1 space-y-1 text-xs">
              {(approved
                ? (analysis.snapshot?.indicators ?? []).map((i) => ({
                    key: i.code,
                    status: i.status as Status,
                    name: i.name,
                    prev: i.previous?.value ?? null,
                    value: i.value,
                    unit: i.unit,
                  }))
                : d.indicators.map((i) => ({
                    key: i.id,
                    status: i.evaluation.status,
                    name: i.name,
                    prev: i.evaluation.previous?.value ?? null,
                    value: i.evaluation.value,
                    unit: i.unit,
                  }))
              ).map((i) => (
                <li key={i.key} className="flex items-start gap-1.5">
                  <StatusDot status={i.status} />
                  <span className="flex-1">{i.name}</span>
                  <span className="whitespace-nowrap tabular-nums">
                    {fmtNum(i.prev)} → {fmtNum(i.value)} {i.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-4 text-sm">
            <p className="h-section mb-1">Eelmise aasta analüüs ({yearLabel(year - 1)})</p>
            {prev ? (
              <>
                <p className="text-xs font-medium text-ink-2">Mida muudame:</p>
                <p className="whitespace-pre-line text-xs">{prev.changeNext || "—"}</p>
                <Link href={`/suunad/${d.code}/analuus/${prev.year}`} className="link mt-1 inline-block text-xs">
                  Ava
                </Link>
              </>
            ) : (
              <p className="text-xs text-ink-3">—</p>
            )}
          </div>

          <div className="card p-4 text-sm">
            <p className="h-section mb-1">Selle aasta otsused</p>
            {decisions.length === 0 ? (
              <p className="text-xs text-ink-3">—</p>
            ) : (
              <ul className="space-y-1">
                {decisions.map((x) => (
                  <li key={x.id} className="text-xs">
                    {fmtDate(x.decidedOn)} <span className="font-semibold uppercase text-accent-ink">{DECISION_LABEL[x.kind]}</span>{" "}
                    {x.title}
                  </li>
                ))}
              </ul>
            )}
            {canEditDirection(user, d.id) && (
              <Link href={`/suunad/${d.code}#otsused`} className="link mt-2 inline-block text-xs">
                + Lisa otsus analüüsi põhjal
              </Link>
            )}
          </div>

          <div className="card p-4 text-sm">
            <p className="h-section mb-1">Ajalugu</p>
            <ul className="space-y-0.5 text-xs">
              {base.years.map((y) => {
                const a = d.analyses.find((x) => x.year === y);
                return (
                  <li key={y}>
                    <Link href={`/suunad/${d.code}/analuus/${y}`} className={y === year ? "font-semibold" : "link"}>
                      {yearLabel(y)}
                    </Link>{" "}
                    <span className="text-ink-3">{a ? (a.status === "approved" ? "kinnitatud" : "mustand") : "—"}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
