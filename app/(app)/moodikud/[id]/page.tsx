import Link from "next/link";
import { notFound } from "next/navigation";
import { addEvidence, archiveIndicator, deleteEvidence, deleteResult, saveResult } from "@/app/actions/plan";
import { Field, Select } from "@/components/fields";
import { ActionForm, SubmitButton } from "@/components/forms";
import { IndicatorForm } from "@/components/indicator-form";
import { StatusBadge, StatusDot } from "@/components/status";
import { TrendChart } from "@/components/trend-chart";
import { canEditDirection, requireUser } from "@/lib/auth";
import { loadPlanModel } from "@/lib/data";
import {
  ACTIVITY_LABEL,
  DECISION_LABEL,
  DIRECTION_LABEL,
  KIND_LABEL,
  LEVEL_LABEL,
  fmtDate,
  fmtDateTime,
  fmtNum,
  fmtValue,
  yearLabel,
} from "@/lib/format";
import { chartSeries, statusForYear } from "@/lib/series";

export default async function IndicatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const model = await loadPlanModel();
  const i = model?.indicators.find((x) => x.id === id);
  if (!model || !i) notFound();
  const dir = model.directions.find((d) => d.id === i.directionId)!;
  const canEdit = canEditDirection(user, dir.id);
  const e = i.evaluation;
  const name = (pid: string | null) => model.profiles.find((p) => p.id === pid)?.fullName ?? "—";
  const sourceName = (sid: string | null) => model.sources.find((s) => s.id === sid)?.name;
  const decisions = model.decisions.filter((x) => x.indicatorId === i.id);
  const resultYears = [model.plan.baselineYear, ...model.years].filter((y) => y > (i.baselineYear ?? 0));
  const series = chartSeries(i);

  return (
    <div className="space-y-5">
      <Link href={`/suunad/${dir.code}`} className="text-sm text-ink-3 hover:underline">
        ← {dir.code} · {i.goal.code} {i.goal.title}
      </Link>

      <header className="card p-4">
        <p className="text-xs text-ink-3">
          {i.code} · {KIND_LABEL[i.kind]} · {LEVEL_LABEL[i.impactLevel]} · {DIRECTION_LABEL[i.direction]} · {i.unit} · reegel{" "}
          {i.rule ? `${i.rule.name} (${i.rule.greenMinPct}/${i.rule.yellowMinPct})` : "vaikimisi 75/40"}
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          {i.isKey && <span title="Võtmenäitaja">★ </span>}
          {i.name}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <p className="h-section">Staatus {yearLabel(model.reportYear)}</p>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={e.status} />
              <span className="text-sm text-ink-2">{e.reason}</span>
            </div>
          </div>
          <Stat label={`Algtase ${i.baselineYear ? yearLabel(i.baselineYear) : ""}`} value={fmtValue(i.baselineValue, i.unit)} />
          <Stat label={`Tulemus ${yearLabel(model.reportYear)}`} value={fmtValue(e.value, i.unit)} />
          <Stat label={`Plaan ${yearLabel(model.reportYear)}`} value={fmtValue(e.plannedValue, i.unit)} />
          <Stat label={`Siht ${yearLabel(i.targetYear)}`} value={fmtValue(i.targetValue, i.unit)} />
        </div>
        {i.description && <p className="mt-3 text-sm text-ink-2">{i.description}</p>}
        <p className="mt-2 text-xs text-ink-3">
          Andmeallikas: {i.source?.name ?? "määramata"} · Vastutaja: {name(i.ownerId)}
          {i.baselineNote && ` · Algtase: ${i.baselineNote}`}
        </p>
      </header>

      <section className="card p-4">
        <h2 className="mb-2 text-sm font-semibold">Trend</h2>
        <TrendChart points={series.points} target={i.targetValue} unit={i.unit} reportYear={model.reportYear} />
      </section>

      <section className="card p-4" id="tulemused">
        <h2 className="mb-2 text-sm font-semibold">Tulemused ja andmete päritolu</h2>
        <div className="overflow-x-auto">
          <table className="table-basic min-w-[760px]">
            <thead>
              <tr>
                <th>Aasta</th>
                <th className="text-right">Väärtus</th>
                <th>Staatus</th>
                <th>Allikas</th>
                <th>Mõõdetud</th>
                <th>Sisestatud</th>
                <th>Kommentaar ja tõendid</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {i.baselineValue != null && (
                <tr>
                  <td>{i.baselineYear ? yearLabel(i.baselineYear) : "—"}</td>
                  <td className="text-right tabular-nums">{fmtNum(i.baselineValue)}</td>
                  <td className="text-xs text-ink-3">algtase</td>
                  <td className="text-xs">{i.source?.name ?? "—"}</td>
                  <td colSpan={canEdit ? 4 : 3} className="text-xs text-ink-3">
                    {i.baselineNote ?? ""}
                  </td>
                </tr>
              )}
              {i.results.map((r) => {
                const ev = model.evidence.filter((x) => x.indicatorResultId === r.id);
                return (
                  <tr key={r.id}>
                    <td>{yearLabel(r.year)}</td>
                    <td className="text-right tabular-nums">{fmtNum(r.value)}</td>
                    <td>
                      <StatusDot status={statusForYear(i, r.year)} />
                    </td>
                    <td className="text-xs">
                      {sourceName(r.sourceId) ?? i.source?.name ?? "—"}
                      {r.sampleSize != null && <span className="block text-ink-3">n = {r.sampleSize}</span>}
                    </td>
                    <td className="text-xs">{fmtDate(r.measuredOn)}</td>
                    <td className="text-xs">
                      {name(r.enteredBy)}
                      <span className="block text-ink-3">{fmtDateTime(r.enteredAt)}</span>
                      {r.updatedAt && (
                        <span className="block text-ink-3">
                          muutis {name(r.updatedBy)} {fmtDateTime(r.updatedAt)}
                        </span>
                      )}
                    </td>
                    <td className="text-xs">
                      {r.comment && <p className="mb-1">{r.comment}</p>}
                      <ul className="space-y-0.5">
                        {ev.map((x) => (
                          <li key={x.id} className="flex items-center gap-2">
                            <a href={x.url ?? "#"} target="_blank" rel="noreferrer noopener" className="link">
                              🔗 {x.title}
                            </a>
                            {canEdit && (
                              <ActionForm action={deleteEvidence} confirm="Eemaldada tõend?">
                                <input type="hidden" name="id" value={x.id} />
                                <button className="text-ink-3 hover:text-s-red" aria-label="Eemalda tõend">
                                  ✕
                                </button>
                              </ActionForm>
                            )}
                          </li>
                        ))}
                      </ul>
                      {canEdit && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-ink-3">+ tõend</summary>
                          <ActionForm action={addEvidence} className="mt-1 space-y-1" resetOnSuccess>
                            <input type="hidden" name="indicatorResultId" value={r.id} />
                            <input name="title" placeholder="Pealkiri" className="input" required />
                            <input name="url" type="url" placeholder="https://…" className="input" required />
                            <SubmitButton small>Lisa</SubmitButton>
                          </ActionForm>
                        </details>
                      )}
                    </td>
                    {canEdit && (
                      <td>
                        <ActionForm action={deleteResult} confirm={`Kustutada ${yearLabel(r.year)} tulemus?`}>
                          <input type="hidden" name="id" value={r.id} />
                          <SubmitButton variant="danger" small>
                            Kustuta
                          </SubmitButton>
                        </ActionForm>
                      </td>
                    )}
                  </tr>
                );
              })}
              {i.results.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-sm text-ink-3">
                    Tulemusi pole veel sisestatud.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {canEdit && (
          <div id="tulemus" className="mt-4 rounded-md border border-line p-3">
            <h3 className="mb-2 text-sm font-semibold">Lisa või paranda aasta tulemus</h3>
            <ActionForm action={saveResult} className="grid gap-3 md:grid-cols-6" resetOnSuccess>
              <input type="hidden" name="indicatorId" value={i.id} />
              <Field label="Õppeaasta">
                <Select
                  name="year"
                  options={resultYears.map((y) => ({ value: y, label: yearLabel(y) }))}
                  defaultValue={model.reportYear}
                />
              </Field>
              <Field label={`Väärtus (${i.unit})`}>
                <input name="value" inputMode="decimal" className="input" required />
              </Field>
              <Field label="Mõõtmise kuupäev">
                <input name="measuredOn" type="date" className="input" />
              </Field>
              <Field label="Valimi suurus (n)">
                <input name="sampleSize" inputMode="numeric" className="input" />
              </Field>
              <Field label="Allikas" className="md:col-span-2" hint="Kui erineb mõõdiku allikast">
                <Select
                  name="sourceId"
                  empty={`Mõõdiku allikas (${i.source?.name ?? "—"})`}
                  options={model.sources.map((s) => ({ value: s.id, label: s.name }))}
                />
              </Field>
              <Field label="Kommentaar" className="md:col-span-2">
                <input name="comment" className="input" />
              </Field>
              <Field label="Tõendi pealkiri">
                <input name="evidenceTitle" className="input" placeholder="nt HARNO raport" />
              </Field>
              <Field label="Tõendi link" className="md:col-span-2">
                <input name="evidenceUrl" type="url" className="input" placeholder="https://…" />
              </Field>
              <div className="flex items-end">
                <SubmitButton>Salvesta tulemus</SubmitButton>
              </div>
            </ActionForm>
            <p className="mt-2 text-xs text-ink-3">
              Sisestaja ja sisestamise aeg salvestatakse automaatselt. Sama aasta uuesti salvestamine parandab olemasolevat
              tulemust.
            </p>
          </div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Seotud tegevused</h2>
          {i.activities.length === 0 ? (
            <p className="text-sm text-ink-3">Ükski tegevus pole selle mõõdikuga seotud.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {i.activities.map((a) => (
                <li key={a.id}>
                  <Link href={`/tegevused/${a.id}`} className="link">
                    {a.title}
                  </Link>{" "}
                  <span className="text-xs text-ink-3">
                    {yearLabel(a.year)} · {a.overdue ? "tähtaeg ületatud" : ACTIVITY_LABEL[a.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Juhtimisotsused</h2>
          {decisions.length === 0 ? (
            <p className="text-sm text-ink-3">
              Otsuseid pole.{" "}
              {canEdit && (
                <Link href={`/suunad/${dir.code}#otsused`} className="link">
                  Lisa otsus
                </Link>
              )}
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {decisions.map((x) => (
                <li key={x.id}>
                  <span className="text-xs text-ink-3">{fmtDate(x.decidedOn)}</span>{" "}
                  <span className="text-xs font-semibold uppercase text-accent-ink">{DECISION_LABEL[x.kind]}</span> {x.title}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {canEdit && (
        <details className="card p-4" id="muuda">
          <summary className="cursor-pointer text-sm font-medium">✎ Muuda mõõdikut</summary>
          <div className="mt-4">
            <IndicatorForm model={model} goalId={i.goalId} indicator={i} />
          </div>
          <ActionForm action={archiveIndicator} className="mt-6 border-t border-line pt-4" confirm="Arhiveerida mõõdik? Ajalugu säilib.">
            <input type="hidden" name="id" value={i.id} />
            <SubmitButton variant="danger">Arhiveeri mõõdik</SubmitButton>
          </ActionForm>
        </details>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="h-section">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
