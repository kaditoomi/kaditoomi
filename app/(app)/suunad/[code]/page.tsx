import Link from "next/link";
import { notFound } from "next/navigation";
import { createDecision, createGoal, deleteDecision, updateDirection, updateGoal } from "@/app/actions/plan";
import { Field, Select, optionsFrom } from "@/components/fields";
import { ActionForm, SubmitButton } from "@/components/forms";
import { IndicatorChartPicker } from "@/components/indicator-chart-picker";
import { StatusBadge, StatusDot, StatusIcon } from "@/components/status";
import { canEditDirection, requireUser } from "@/lib/auth";
import { loadPlanModel } from "@/lib/data";
import {
  ACTIVITY_LABEL,
  DECISION_LABEL,
  GAP_LABEL,
  KIND_LABEL,
  LEVEL_LABEL,
  fmtDate,
  fmtNum,
  yearLabel,
} from "@/lib/format";
import type { ActivityView, DirectionView, GoalView, IndicatorView } from "@/lib/model";
import { chartSeries, statusForYear } from "@/lib/series";

export default async function DirectionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireUser();
  const model = await loadPlanModel();
  const d = model?.directions.find((x) => x.code === decodeURIComponent(code));
  if (!model || !d) notFound();
  const canEdit = canEditDirection(user, d.id);
  const timelineYears = [model.plan.baselineYear, ...model.years];
  const process = d.indicators.filter((i) => i.kind === "process");
  const outcome = d.indicators.filter((i) => i.kind === "outcome");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-ink-3 hover:underline">
          ← Juhtkonna vaade
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink-3">{d.code}</span>
              <StatusBadge status={d.status} />
              <span className="text-xs text-ink-3">{d.statusReason}</span>
            </div>
            <h1 className="mt-1 text-xl font-semibold leading-snug">{d.title}</h1>
            <p className="mt-1 text-sm text-ink-3">
              Vastutaja: {d.owners.map((o) => `${o.fullName}${o.isLead ? " (peavastutaja)" : ""}`).join(", ") || "määramata"}
              {!canEdit && " · sul on selle suuna kohta lugemisõigus"}
            </p>
          </div>
          <Link href={`/suunad/${d.code}/analuus/${model.reportYear}`} className="btn-primary">
            Mõjuanalüüs {yearLabel(model.reportYear)}
          </Link>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <InfoBox title="Lähtekoht">{d.startingPoint}</InfoBox>
        <InfoBox title="Soovitud muutus">{d.desiredChange}</InfoBox>
        <InfoBox title="Mõju õppijale">{d.learnerImpact}</InfoBox>
      </section>
      {canEdit && <DirectionEdit d={d} />}

      {d.gaps.length > 0 && (
        <section className="card border-dashed p-4">
          <h2 className="mb-2 text-sm font-semibold">Andmelüngad ({d.gaps.length})</h2>
          <ul className="space-y-1 text-sm">
            {d.gaps.map((g, i) => (
              <li key={i} className="flex items-start gap-2">
                <StatusIcon status="gray" />
                <span>
                  <span className="mr-1 font-medium">{GAP_LABEL[g.gapType]}:</span>
                  {g.message}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card overflow-x-auto p-4" aria-labelledby="ajajoon">
        <h2 id="ajajoon" className="mb-3 text-sm font-semibold">
          Ajajoon {model.plan.startYear}–{model.plan.endYear}
        </h2>
        <table className="w-full min-w-[960px] table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-52 border-b border-line py-1.5 text-left text-xs font-medium text-ink-3" />
              {timelineYears.map((y) => (
                <th
                  key={y}
                  className={`border-b border-line px-2 py-1.5 text-left text-xs font-medium ${y === model.reportYear ? "bg-surface-2 text-ink" : "text-ink-3"}`}
                >
                  {yearLabel(y)}
                  {y === model.plan.baselineYear && " (algtase)"}
                </th>
              ))}
              <th className="w-20 border-b border-line px-2 py-1.5 text-left text-xs font-medium text-ink-3">Siht</th>
            </tr>
          </thead>
          <tbody>
            <TimelineGroup cols={timelineYears.length + 2} label="Planeeritud tegevused" />
            <tr>
              <td className="border-b border-line py-2 pr-2 align-top text-xs text-ink-3">kavandatud aasta järgi</td>
              {timelineYears.map((y) => (
                <td key={y} className={`border-b border-line px-2 py-2 align-top ${y === model.reportYear ? "bg-surface-2" : ""}`}>
                  <ul className="space-y-1">
                    {d.activities
                      .filter((a) => a.year === y)
                      .map((a) => (
                        <li key={a.id} className="text-xs leading-snug">
                          <Link href={`/tegevused/${a.id}`} className="hover:underline">
                            <ActivityMark a={a} /> {a.title}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </td>
              ))}
              <td className="border-b border-line" />
            </tr>
            <TimelineGroup cols={timelineYears.length + 2} label="Protsessinäitajad" />
            {process.map((i) => (
              <IndicatorTimelineRow key={i.id} i={i} years={timelineYears} reportYear={model.reportYear} />
            ))}
            <TimelineGroup cols={timelineYears.length + 2} label="Tulemusnäitajad" />
            {outcome.map((i) => (
              <IndicatorTimelineRow key={i.id} i={i} years={timelineYears} reportYear={model.reportYear} />
            ))}
            <TimelineGroup cols={timelineYears.length + 2} label="Vahehinnangud" />
            <tr>
              <td className="border-b border-line py-2 text-xs text-ink-3">aasta mõjuanalüüs</td>
              {timelineYears.map((y) => {
                const a = d.analyses.find((x) => x.year === y);
                return (
                  <td key={y} className={`border-b border-line px-2 py-2 text-xs ${y === model.reportYear ? "bg-surface-2" : ""}`}>
                    {y >= model.plan.startYear && (
                      <Link href={`/suunad/${d.code}/analuus/${y}`} className="link">
                        {a ? (a.status === "approved" ? "◆ kinnitatud" : "◇ mustand") : y <= model.reportYear ? "+ koosta" : ""}
                      </Link>
                    )}
                  </td>
                );
              })}
              <td className="border-b border-line" />
            </tr>
            <TimelineGroup cols={timelineYears.length + 2} label="Muudatused tegevuskavas" />
            <tr>
              <td className="py-2 text-xs text-ink-3">otsused (kehtivad aastast)</td>
              {timelineYears.map((y) => (
                <td key={y} className={`px-2 py-2 align-top ${y === model.reportYear ? "bg-surface-2" : ""}`}>
                  <ul className="space-y-1">
                    {d.decisions
                      .filter((x) => (x.effectiveYear ?? Number(x.decidedOn.slice(0, 4))) === y)
                      .map((x) => (
                        <li key={x.id} className="text-xs leading-snug">
                          <span className="font-semibold uppercase text-accent-ink">{DECISION_LABEL[x.kind]}</span> {x.title}
                        </li>
                      ))}
                  </ul>
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ink-3">
          Tegevused: ✓ tehtud · ▶ töös · ○ planeeritud · ⏸ edasi lükatud · ✕ loobutud · <span className="text-s-red">⚠ tähtaeg ületatud</span>
        </p>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">Trend</h2>
        <IndicatorChartPicker series={d.indicators.map(chartSeries)} reportYear={model.reportYear} />
      </section>

      <section className="space-y-4" id="tegevused">
        <h2 className="text-base font-semibold">Eesmärgid, mõõdikud ja tegevused</h2>
        {d.goals.map((g) => (
          <GoalSection key={g.id} g={g} canEdit={canEdit} reportYear={model.reportYear} />
        ))}
        {canEdit && (
          <details className="card p-4">
            <summary className="cursor-pointer text-sm font-medium">+ Lisa eesmärk</summary>
            <ActionForm action={createGoal} className="mt-3 grid gap-3 md:grid-cols-2" resetOnSuccess>
              <input type="hidden" name="directionId" value={d.id} />
              <Field label="Kood">
                <input name="code" className="input" required placeholder={`${d.code}.${d.goals.length + 1}`} />
              </Field>
              <Field label="Eesmärk">
                <input name="title" className="input" required />
              </Field>
              <Field label="Soovitud muutus">
                <textarea name="desiredChange" className="input" rows={2} />
              </Field>
              <Field label="Mõju õppijale">
                <textarea name="learnerImpact" className="input" rows={2} />
              </Field>
              <div>
                <SubmitButton>Lisa eesmärk</SubmitButton>
              </div>
            </ActionForm>
          </details>
        )}
      </section>

      <section className="card p-4" id="otsused">
        <h2 className="mb-2 text-sm font-semibold">Juhtimisotsused ja tegevuskava muudatused</h2>
        {d.decisions.length === 0 && <p className="text-sm text-ink-3">Otsuseid pole.</p>}
        <ul className="divide-y divide-line">
          {d.decisions.map((x) => {
            const ind = x.indicatorId ? d.indicators.find((i) => i.id === x.indicatorId) : null;
            return (
              <li key={x.id} className="flex items-start gap-3 py-2.5 text-sm">
                <div className="w-24 shrink-0 text-xs text-ink-3">{fmtDate(x.decidedOn)}</div>
                <div className="min-w-0 flex-1">
                  <p>
                    <span className="mr-1.5 text-xs font-semibold uppercase text-accent-ink">{DECISION_LABEL[x.kind]}</span>
                    {x.title}
                  </p>
                  {x.rationale && <p className="mt-0.5 text-xs text-ink-2">Põhjendus: {x.rationale}</p>}
                  <p className="mt-0.5 text-xs text-ink-3">
                    {x.effectiveYear ? `Kehtib alates ${yearLabel(x.effectiveYear)}` : ""}
                    {ind && (
                      <>
                        {" · "}
                        <Link href={`/moodikud/${ind.id}`} className="link">
                          {ind.code}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                {canEdit && (
                  <ActionForm action={deleteDecision} confirm="Kustutada otsus?">
                    <input type="hidden" name="id" value={x.id} />
                    <SubmitButton variant="danger" small>
                      Kustuta
                    </SubmitButton>
                  </ActionForm>
                )}
              </li>
            );
          })}
        </ul>
        {canEdit && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium">+ Lisa otsus</summary>
            <ActionForm action={createDecision} className="mt-3 grid gap-3 md:grid-cols-4" resetOnSuccess>
              <input type="hidden" name="directionId" value={d.id} />
              <Field label="Kuupäev">
                <input type="date" name="decidedOn" defaultValue={model.asOf} className="input" required />
              </Field>
              <Field label="Otsus">
                <Select name="kind" options={optionsFrom(DECISION_LABEL)} defaultValue="change" />
              </Field>
              <Field label="Kehtib õppeaastast">
                <Select
                  name="effectiveYear"
                  empty="—"
                  defaultValue={Math.min(model.reportYear + 1, model.plan.endYear)}
                  options={model.years.map((y) => ({ value: y, label: yearLabel(y) }))}
                />
              </Field>
              <Field label="Seotud mõõdik">
                <Select
                  name="indicatorId"
                  empty="—"
                  options={d.indicators.map((i) => ({ value: i.id, label: `${i.code} ${i.name}` }))}
                />
              </Field>
              <Field label="Otsus lühidalt" className="md:col-span-2">
                <input name="title" className="input" required />
              </Field>
              <Field label="Põhjendus (millele otsus tugineb)" className="md:col-span-2">
                <input name="rationale" className="input" />
              </Field>
              <div>
                <SubmitButton>Lisa otsus</SubmitButton>
              </div>
            </ActionForm>
          </details>
        )}
      </section>
    </div>
  );
}

function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-3">
      <p className="h-section mb-1">{title}</p>
      <p className="text-sm text-ink-2">{children || "—"}</p>
    </div>
  );
}

function TimelineGroup({ label, cols }: { label: string; cols: number }) {
  return (
    <tr>
      <th colSpan={cols} className="pb-1 pt-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
        {label}
      </th>
    </tr>
  );
}

function IndicatorTimelineRow({ i, years, reportYear }: { i: IndicatorView; years: number[]; reportYear: number }) {
  return (
    <tr>
      <td className="border-b border-line py-1.5 pr-2 align-top text-xs">
        <Link href={`/moodikud/${i.id}`} className="hover:underline">
          {i.isKey && <span title="Võtmenäitaja">★ </span>}
          {i.name}
        </Link>
        <span className="block text-ink-3">{i.source?.name ?? "allikas määramata"}</span>
      </td>
      {years.map((y) => {
        const isBase = y === i.baselineYear;
        const r = i.results.find((x) => x.year === y);
        const value = isBase ? i.baselineValue : r?.value;
        const st = !isBase && r ? statusForYear(i, y) : null;
        return (
          <td key={y} className={`border-b border-line px-2 py-1.5 align-top tabular-nums ${y === reportYear ? "bg-surface-2" : ""}`}>
            {value != null ? (
              <span className="inline-flex items-center gap-1">
                {st && <StatusDot status={st} />}
                {fmtNum(value)}
              </span>
            ) : y === reportYear ? (
              <span className="inline-flex items-center gap-1 text-xs text-ink-3">
                <StatusDot status="gray" /> puudub
              </span>
            ) : (
              ""
            )}
          </td>
        );
      })}
      <td className="border-b border-line px-2 py-1.5 align-top tabular-nums">
        {fmtNum(i.targetValue)} <span className="text-xs text-ink-3">{i.unit}</span>
      </td>
    </tr>
  );
}

function ActivityMark({ a }: { a: ActivityView }) {
  if (a.overdue) return <span className="text-s-red" title="Tähtaeg ületatud">⚠</span>;
  const m = { done: "✓", in_progress: "▶", planned: "○", postponed: "⏸", cancelled: "✕" }[a.status];
  return <span title={ACTIVITY_LABEL[a.status]}>{m}</span>;
}

function DirectionEdit({ d }: { d: DirectionView }) {
  return (
    <details className="card p-4">
      <summary className="cursor-pointer text-sm font-medium">✎ Muuda arengusuuna kirjeldust</summary>
      <ActionForm action={updateDirection} className="mt-3 grid gap-3">
        <input type="hidden" name="id" value={d.id} />
        <Field label="Eesmärgi nimetus">
          <input name="title" defaultValue={d.title} className="input" required />
        </Field>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Lähtekoht">
            <textarea name="startingPoint" defaultValue={d.startingPoint ?? ""} rows={4} className="input" />
          </Field>
          <Field label="Soovitud muutus">
            <textarea name="desiredChange" defaultValue={d.desiredChange ?? ""} rows={4} className="input" />
          </Field>
          <Field label="Mõju õppijale">
            <textarea name="learnerImpact" defaultValue={d.learnerImpact ?? ""} rows={4} className="input" />
          </Field>
        </div>
        <div>
          <SubmitButton>Salvesta</SubmitButton>
        </div>
      </ActionForm>
    </details>
  );
}

function GoalSection({ g, canEdit, reportYear }: { g: GoalView; canEdit: boolean; reportYear: number }) {
  const hasOutcome = g.indicators.some((i) => i.kind === "outcome");
  return (
    <article className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="max-w-3xl">
          <h3 className="font-semibold">
            <span className="text-ink-3">{g.code}</span> {g.title}
          </h3>
          {(g.desiredChange || g.learnerImpact) && (
            <p className="mt-0.5 text-sm text-ink-2">
              {g.desiredChange && <>Soovitud muutus: {g.desiredChange} </>}
              {g.learnerImpact && <>· Mõju õppijale: {g.learnerImpact}</>}
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Link href={`/moodikud/uus?eesmark=${g.id}`} className="btn btn-sm">
              + Mõõdik
            </Link>
            <Link href={`/tegevused/uus?eesmark=${g.id}`} className="btn btn-sm">
              + Tegevus
            </Link>
          </div>
        )}
      </div>

      {g.chainBreak && (
        <p className="mt-2 rounded-md bg-s-red-bg px-2.5 py-1.5 text-sm">
          ⚡ Praktika muutus, kuid õppija tulemus mitte — vaata üle, kas tegevus jõuab õppijani.
        </p>
      )}
      {!hasOutcome && (
        <p className="mt-2 flex items-center gap-2 rounded-md border border-dashed border-line px-2.5 py-1.5 text-sm text-ink-2">
          <StatusIcon status="gray" /> Mõõdik puudub → vaja luua tulemusnäitaja ja algtaseme mõõtmine.
          {canEdit && (
            <Link href={`/moodikud/uus?eesmark=${g.id}`} className="link">
              Loo mõõdik
            </Link>
          )}
        </p>
      )}

      {g.indicators.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="table-basic min-w-[760px]">
            <thead>
              <tr>
                <th>Mõõdik</th>
                <th>Tüüp / tasand</th>
                <th>Allikas</th>
                <th className="text-right">Algtase</th>
                <th className="text-right">{yearLabel(reportYear)}</th>
                <th className="text-right">Siht</th>
                <th>Staatus</th>
              </tr>
            </thead>
            <tbody>
              {g.indicators.map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link href={`/moodikud/${i.id}`} className="link">
                      {i.isKey && "★ "}
                      {i.name}
                    </Link>
                    <span className="block text-xs text-ink-3">{i.code}</span>
                  </td>
                  <td className="text-xs text-ink-2">
                    {KIND_LABEL[i.kind]}
                    <span className="block text-ink-3">{LEVEL_LABEL[i.impactLevel]}</span>
                  </td>
                  <td className="text-xs text-ink-2">{i.source?.name ?? "—"}</td>
                  <td className="text-right tabular-nums">
                    {fmtNum(i.baselineValue)}
                    {i.baselineYear && <span className="block text-xs text-ink-3">{yearLabel(i.baselineYear)}</span>}
                  </td>
                  <td className="text-right tabular-nums">{fmtNum(i.evaluation.value)}</td>
                  <td className="text-right tabular-nums">
                    {fmtNum(i.targetValue)} <span className="text-xs text-ink-3">{i.unit}</span>
                  </td>
                  <td>
                    <StatusBadge status={i.evaluation.status} title={i.evaluation.reason} />
                    <span className="mt-0.5 block max-w-56 text-xs text-ink-3">{i.evaluation.reason}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3">
        <p className="h-section mb-1">Tegevused</p>
        {g.activities.length === 0 ? (
          <p className="text-sm text-ink-3">Tegevusi pole.</p>
        ) : (
          <ul className="divide-y divide-line">
            {g.activities.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5 text-sm">
                <Link href={`/tegevused/${a.id}`} className="link">
                  <ActivityMark a={a} /> {a.title}
                </Link>
                <span className="text-xs text-ink-3">
                  {yearLabel(a.year)} · tähtaeg {fmtDate(a.dueDate)} ·{" "}
                  <span className={a.overdue ? "font-medium text-s-red" : ""}>
                    {a.overdue ? "tähtaeg ületatud" : ACTIVITY_LABEL[a.status]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canEdit && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-ink-3">✎ Muuda eesmärki</summary>
          <ActionForm action={updateGoal} className="mt-2 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="id" value={g.id} />
            <Field label="Kood">
              <input name="code" defaultValue={g.code} className="input" required />
            </Field>
            <Field label="Eesmärk">
              <input name="title" defaultValue={g.title} className="input" required />
            </Field>
            <Field label="Soovitud muutus">
              <textarea name="desiredChange" defaultValue={g.desiredChange ?? ""} className="input" rows={2} />
            </Field>
            <Field label="Mõju õppijale">
              <textarea name="learnerImpact" defaultValue={g.learnerImpact ?? ""} className="input" rows={2} />
            </Field>
            <div>
              <SubmitButton>Salvesta</SubmitButton>
            </div>
          </ActionForm>
        </details>
      )}
    </article>
  );
}
