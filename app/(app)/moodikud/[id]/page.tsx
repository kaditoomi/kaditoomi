import Link from "next/link";
import { notFound } from "next/navigation";
import { addEvidence, deleteEvidence, deleteResult, saveResult } from "@/app/actions/plan";
import { Field, Select } from "@/components/fields";
import { ActionForm, SubmitButton } from "@/components/forms";
import { ChangeBadge, DataChip } from "@/components/signals";
import { StatusBadge, StatusDot } from "@/components/status";
import { TrendChart } from "@/components/trend-chart";
import { canEditDirection, requireUser } from "@/lib/auth";
import { loadPlanModel } from "@/lib/data";
import { DECISION_LABEL, DIRECTION_LABEL, KIND_LABEL, activityStatusLabel, fmtDate, fmtDateTime, fmtNum, fmtValue, yearLabel } from "@/lib/format";
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
  const firstYear = Math.min(i.baselineYear ?? model.plan.startYear, model.plan.startYear);
  const resultYears: number[] = [];
  for (let y = firstYear; y <= model.plan.endYear; y++) resultYears.push(y);
  const series = chartSeries(i);
  const defaultYear = Math.min(model.reportYear, model.plan.endYear);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/suunad/${dir.code}`} className="text-sm text-ink-3 hover:underline">
          ← {dir.code} · {dir.title}
        </Link>
        {canEdit && (
          <Link href={`/moodikud/${i.id}/seadista`} className="btn btn-sm">
            ⚙ Seadista mõõdikut
          </Link>
        )}
      </div>

      <header className="card p-5">
        <p className="text-xs text-ink-3">
          {KIND_LABEL[i.kind]} · soovitud suund: {DIRECTION_LABEL[i.direction].toLowerCase()} · {i.source?.name ?? "allikas määramata"}
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          {i.isKey && <span title="Võtmenäitaja">★ </span>}
          {i.name}
        </h1>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Algtase">
            {fmtValue(i.baselineValue, i.unit)}
            {i.baselineNote && <span className="block text-xs font-normal text-ink-3">{i.baselineNote}</span>}
          </Stat>
          <Stat label={i.last ? `Viimane mõõtmine (${yearLabel(i.last.year)})` : "Viimane mõõtmine"}>
            {i.last ? fmtValue(i.last.value, i.unit) : "—"}
            <span className="mt-1 block">
              <ChangeBadge
                change={i.change}
                title={i.prev ? `Eelmine: ${yearLabel(i.prev.year)} ${fmtNum(i.prev.value)}` : undefined}
              />
            </span>
          </Stat>
          <Stat label={`Siht ${yearLabel(i.targetYear)}`}>{fmtValue(i.targetValue, i.unit)}</Stat>
          <Stat label="Seis">
            {i.data.state !== "ok" ? (
              <span className="flex flex-col items-start gap-1">
                <DataChip state={i.data.state} reason={i.data.reason} />
                <span className="text-xs font-normal text-ink-3">{i.data.reason}</span>
              </span>
            ) : (
              <span className="flex flex-col items-start gap-1">
                <StatusBadge status={e.status} />
                <span className="text-xs font-normal text-ink-3">{e.reason}</span>
              </span>
            )}
          </Stat>
        </div>
        {i.description && <p className="mt-4 text-sm text-ink-2">{i.description}</p>}
      </header>

      {canEdit && (
        <section id="tulemus" className="card border-accent/30 p-5">
          <h2 className="mb-1 text-lg font-bold">Lisa tulemus</h2>
          <p className="mb-3 text-sm text-ink-3">
            Sisesta uus väärtus. Süsteem võrdleb seda ise eelmise mõõtmise, algtaseme ja sihiga. Sama aasta uuesti salvestamine
            parandab tulemust.
          </p>
          <ActionForm action={saveResult} className="grid gap-3 sm:grid-cols-[10rem_10rem_12rem_auto] sm:items-end" resetOnSuccess>
            <input type="hidden" name="indicatorId" value={i.id} />
            <Field label="Õppeaasta">
              <Select name="year" options={resultYears.map((y) => ({ value: y, label: yearLabel(y) }))} defaultValue={defaultYear} />
            </Field>
            <Field label={`Väärtus (${i.unit})`}>
              <input name="value" inputMode="decimal" className="input" required placeholder="nt 3,2" />
            </Field>
            <Field label="Mõõtmise aeg">
              <input name="measuredOn" type="date" className="input" />
            </Field>
            <div>
              <SubmitButton>Salvesta tulemus</SubmitButton>
            </div>
            <details className="sm:col-span-4">
              <summary className="link text-sm">Lisaväljad: allikas, valim, kommentaar, tõendi link</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Allikas" hint="Kui erineb mõõdiku tavapärasest allikast">
                  <Select
                    name="sourceId"
                    empty={`Tavapärane (${i.source?.name ?? "—"})`}
                    options={model.sources.map((s) => ({ value: s.id, label: s.name }))}
                  />
                </Field>
                <Field label="Valimi suurus (n)">
                  <input name="sampleSize" inputMode="numeric" className="input" />
                </Field>
                <Field label="Kommentaar">
                  <input name="comment" className="input" />
                </Field>
                <Field label="Tõendi link (nt raport Drive'is)">
                  <input name="evidenceUrl" type="url" className="input" placeholder="https://…" />
                </Field>
                <input type="hidden" name="evidenceTitle" value="Tõend" />
              </div>
            </details>
          </ActionForm>
        </section>
      )}

      <section className="card p-5">
        <h2 className="mb-2 text-lg font-bold">Trend</h2>
        <TrendChart points={series.points} target={i.targetValue} unit={i.unit} reportYear={model.reportYear} />
      </section>

      <section className="card p-5">
        <h2 className="mb-2 text-lg font-bold">Mõõtmised ja andmete päritolu</h2>
        <div className="overflow-x-auto">
          <table className="table-basic min-w-[680px]">
            <thead>
              <tr>
                <th>Õppeaasta</th>
                <th className="text-right">Väärtus</th>
                <th>Võrreldes eelmisega</th>
                <th>Allikas</th>
                <th>Sisestatud</th>
                <th>Kommentaar ja tõendid</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {[...i.results].reverse().map((r, idx, arr) => {
                const prev = arr[idx + 1];
                const ev = model.evidence.filter((x) => x.indicatorResultId === r.id);
                const st = r.year > (i.baselineYear ?? 0) ? statusForYear(i, r.year) : null;
                return (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">
                      {yearLabel(r.year)}
                      {st && st !== "gray" && (
                        <span className="ml-1.5 align-middle">
                          <StatusDot status={st} />
                        </span>
                      )}
                    </td>
                    <td className="text-right font-semibold tabular-nums">{fmtNum(r.value)}</td>
                    <td className="text-xs tabular-nums text-ink-2">
                      {prev ? `${fmtNum(prev.value)} → ${fmtNum(r.value)}` : "—"}
                    </td>
                    <td className="text-xs">
                      {sourceName(r.sourceId) ?? i.source?.name ?? "—"}
                      {r.sampleSize != null && <span className="block text-ink-3">n = {r.sampleSize}</span>}
                      {r.measuredOn && <span className="block text-ink-3">mõõdetud {fmtDate(r.measuredOn)}</span>}
                    </td>
                    <td className="text-xs">
                      {r.enteredBy ? name(r.enteredBy) : "andmete import"}
                      <span className="block text-ink-3">{fmtDateTime(r.enteredAt)}</span>
                    </td>
                    <td className="text-xs">
                      {r.comment && <p className="mb-1">{r.comment}</p>}
                      {ev.map((x) => (
                        <span key={x.id} className="mr-2 inline-flex items-center gap-1">
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
                        </span>
                      ))}
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
                          <button className="text-xs text-ink-3 hover:text-s-red">Kustuta</button>
                        </ActionForm>
                      </td>
                    )}
                  </tr>
                );
              })}
              {i.results.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-sm text-ink-3">
                    Mõõtmisi pole veel. {i.data.reason}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-2 font-bold">Seotud tegevused</h2>
          {i.activities.length === 0 ? (
            <p className="text-sm text-ink-3">Ükski tegevus pole selle mõõdikuga seotud.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {i.activities.map((a) => (
                <li key={a.id}>
                  <Link href={`/tegevused/${a.id}`} className="link">
                    {a.title}
                  </Link>{" "}
                  <span className="text-xs text-ink-3">
                    {yearLabel(a.year)} · {a.overdue ? "tähtaeg möödas" : activityStatusLabel(a.kind ?? "milestone", a.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-2 font-bold">Juhtimisotsused</h2>
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
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="h-section">{label}</p>
      <div className="mt-1 text-lg font-bold tabular-nums">{children}</div>
    </div>
  );
}
