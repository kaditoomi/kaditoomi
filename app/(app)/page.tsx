import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkline } from "@/components/sparkline";
import { StatusBadge, StatusDot, StatusIcon } from "@/components/status";
import { loadPlanModel } from "@/lib/data";
import {
  ACTIVITY_LABEL,
  DECISION_LABEL,
  GAP_LABEL,
  KIND_LABEL,
  fmtDate,
  fmtDelta,
  fmtNum,
  fmtValue,
  yearLabel,
} from "@/lib/format";
import type { DirectionView, IndicatorView, PlanModel } from "@/lib/model";

export default async function DashboardPage() {
  const model = await loadPlanModel();
  if (!model) notFound();
  const { directions, reportYear } = model;
  const dirCode = new Map(directions.map((d) => [d.id, d.code]));
  const pendingAnalyses = directions.map((d) => ({ d, a: d.analyses.find((x) => x.year === reportYear) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Juhtkonna vaade</h1>
        <p className="text-sm text-ink-3">
          Õppeaasta {yearLabel(reportYear)} · seisuga {fmtDate(model.asOf)}
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-3" aria-label="Arengusuunad">
        {directions.map((d) => (
          <DirectionCard key={d.id} d={d} model={model} />
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Vajab tähelepanu" count={model.attention.length} id="tahelepanu">
          {model.attention.length === 0 ? (
            <Empty>Ühtegi punast ega kollast mõõdikut.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {model.attention.map((i) => (
                <li key={i.id} className="flex items-start gap-2 py-2">
                  <StatusDot status={i.evaluation.status} title={i.evaluation.reason} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/moodikud/${i.id}`} className="link text-sm">
                      <span className="text-ink-3">{i.goal.code}</span> {i.name}
                    </Link>
                    <p className="text-xs text-ink-3">
                      {KIND_LABEL[i.kind]} · {i.evaluation.reason}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-sm tabular-nums">
                    {fmtNum(i.evaluation.previous?.value)} → {fmtValue(i.evaluation.value, i.unit)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Tähtaeg ületatud" count={model.overdue.length} id="tahtaeg">
          {model.overdue.length === 0 ? (
            <Empty>Tähtaja ületanud tegevusi pole.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {model.overdue.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <Link href={`/tegevused/${a.id}`} className="link">
                    <span className="text-ink-3">{a.goal.code}</span> {a.title}
                  </Link>
                  <span className="whitespace-nowrap text-xs text-ink-3">
                    {fmtDate(a.dueDate)} · {ACTIVITY_LABEL[a.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Andmelüngad" count={model.gaps.length} id="andmelungad">
          {model.gaps.length === 0 ? (
            <Empty>Kõigil eesmärkidel on mõõdik, algtase, siht ja selle aasta tulemus.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {model.gaps.map((g, idx) => (
                <li key={idx} className="flex items-start gap-2 py-2 text-sm">
                  <StatusIcon status="gray" />
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="mr-1 rounded bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-ink-2">
                        {GAP_LABEL[g.gapType]}
                      </span>
                      {g.message}
                    </p>
                  </div>
                  <GapAction gap={g} code={dirCode.get(g.directionId)} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Viimased juhtimisotsused" id="otsused">
          {model.decisions.length === 0 ? (
            <Empty>Otsuseid pole veel lisatud.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {model.decisions.slice(0, 6).map((x) => (
                <li key={x.id} className="py-2 text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-ink-3">{fmtDate(x.decidedOn)}</span>
                    <Link href={`/suunad/${dirCode.get(x.directionId)}#otsused`} className="text-xs font-semibold">
                      {dirCode.get(x.directionId)}
                    </Link>
                    <span className="text-xs font-semibold uppercase text-accent-ink">{DECISION_LABEL[x.kind]}</span>
                  </div>
                  <p>{x.title}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <section className="card flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
        <span className="h-section">Mõjuanalüüs {yearLabel(reportYear)}</span>
        {pendingAnalyses.map(({ d, a }) => (
          <Link key={d.id} href={`/suunad/${d.code}/analuus/${reportYear}`} className="link">
            {d.code}:{" "}
            {a ? (a.status === "approved" ? "✓ kinnitatud" : "mustand — ootab kinnitamist") : "alustamata"}
          </Link>
        ))}
      </section>
    </div>
  );
}

function DirectionCard({ d, model }: { d: DirectionView; model: PlanModel }) {
  const lvl = d.levels;
  return (
    <article className="card flex flex-col p-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/suunad/${d.code}`} className="text-sm font-semibold hover:underline">
          {d.code}
        </Link>
        <StatusBadge status={d.status} title={d.statusReason} />
      </div>
      <h2 className="mt-1 text-[15px] font-semibold leading-snug">
        <Link href={`/suunad/${d.code}`} className="hover:underline">
          {d.title}
        </Link>
      </h2>
      <p className="mt-0.5 text-xs text-ink-3">
        {d.statusReason} · Vastutaja: {d.owners.map((o) => o.fullName).join(", ") || "määramata"}
      </p>

      <div className="mt-4">
        <p className="h-section mb-1.5">Mõjuahel</p>
        <dl className="space-y-1.5 text-sm">
          <LevelRow n={1} label="Tegevused toimusid">
            <span className="tabular-nums">
              {lvl.activities.done}/{lvl.activities.total} tehtud
            </span>
            {lvl.activities.overdue > 0 && (
              <span className="ml-2 text-xs font-medium text-s-red">⚠ {lvl.activities.overdue} hilinenud</span>
            )}
            {lvl.activities.postponed > 0 && (
              <span className="ml-2 text-xs text-ink-3">{lvl.activities.postponed} edasi lükatud</span>
            )}
          </LevelRow>
          <LevelRow n={2} label="Praktika muutus">
            <Dots items={lvl.practice} />
          </LevelRow>
          <LevelRow n={3} label="Jõudis õppijani">
            <Dots items={lvl.learnerReach} />
          </LevelRow>
          <LevelRow n={4} label="Õppija tulemus">
            <Dots items={lvl.learnerResult} />
          </LevelRow>
        </dl>
        {d.chainBreakGoals.map((g) => (
          <p key={g.id} className="mt-2 rounded-md bg-s-red-bg px-2 py-1.5 text-xs text-ink">
            <strong>⚡ {g.code}:</strong> praktika muutus, kuid õppija tulemus mitte — kas tegevus jõuab õppijani?
          </p>
        ))}
      </div>

      <div className="mt-4 space-y-3 border-t border-line pt-3">
        <p className="h-section">Võtmenäitaja</p>
        {d.keyIndicators.length === 0 && <p className="text-xs text-ink-3">Võtmenäitajat pole määratud.</p>}
        {d.keyIndicators.map((i) => (
          <KeyIndicator key={i.id} i={i} reportYear={model.reportYear} />
        ))}
      </div>
    </article>
  );
}

function KeyIndicator({ i, reportYear }: { i: IndicatorView; reportYear: number }) {
  const e = i.evaluation;
  const current = i.results.find((r) => r.year === reportYear);
  const points = [
    ...(i.baselineValue != null && i.baselineYear != null ? [{ year: i.baselineYear, value: i.baselineValue }] : []),
    ...i.results.filter((r) => r.year <= reportYear).map((r) => ({ year: r.year, value: r.value })),
  ];
  const delta = e.value != null && e.previous ? e.value - e.previous.value : null;
  return (
    <div>
      <Link href={`/moodikud/${i.id}`} className="link text-sm">
        {i.name}
      </Link>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{fmtValue(e.value ?? e.latest?.value, i.unit)}</span>
            {delta != null && (
              <span className="text-sm tabular-nums text-ink-2" title={`võrreldes ${e.previous!.year}`}>
                {fmtDelta(delta)}
              </span>
            )}
          </div>
          <p className="text-xs text-ink-3">
            siht {fmtValue(i.targetValue, i.unit)} · <StatusLabel status={e.status} />
          </p>
        </div>
        <Sparkline points={points} target={i.targetValue} unit={i.unit} />
      </div>
      <p className="mt-1 text-xs text-ink-3">
        {i.source?.name ?? "allikas määramata"}
        {current?.measuredOn ? ` · mõõdetud ${fmtDate(current.measuredOn)}` : ""}
        {!current && e.latest ? ` · viimane andmepunkt ${yearLabel(e.latest.year)}` : ""}
      </p>
    </div>
  );
}

function StatusLabel({ status }: { status: IndicatorView["evaluation"]["status"] }) {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <StatusIcon status={status} size={11} />
      {status === "green" ? "roheline" : status === "yellow" ? "kollane" : status === "red" ? "punane" : "andmed puuduvad"}
    </span>
  );
}

function LevelRow({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="w-40 shrink-0 whitespace-nowrap text-ink-2">
        <span className="mr-1.5 inline-block w-4 text-center text-xs text-ink-3">{n}</span>
        {label}
      </dt>
      <dd className="flex flex-wrap items-center">{children}</dd>
    </div>
  );
}

function Dots({ items }: { items: IndicatorView[] }) {
  if (items.length === 0) return <span className="text-xs text-ink-3">mõõdik puudub</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((i) => (
        <Link key={i.id} href={`/moodikud/${i.id}`} className="rounded p-0.5 hover:bg-surface-2">
          <StatusDot status={i.evaluation.status} title={`${i.name} — ${i.evaluation.reason}`} />
        </Link>
      ))}
    </span>
  );
}

function Panel({ title, count, id, children }: { title: string; count?: number; id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
        {title}
        {count != null && <span className="rounded-full bg-surface-2 px-2 text-xs font-medium text-ink-2">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-ink-3">{children}</p>;
}

function GapAction({ gap, code }: { gap: PlanModel["gaps"][number]; code?: string }) {
  if (gap.gapType === "no_outcome_indicator") {
    return (
      <Link href={`/moodikud/uus?eesmark=${gap.goalId}`} className="btn btn-sm whitespace-nowrap">
        + Mõõdik
      </Link>
    );
  }
  if (gap.indicatorId && gap.gapType === "no_current_result") {
    return (
      <Link href={`/moodikud/${gap.indicatorId}#tulemus`} className="btn btn-sm whitespace-nowrap">
        + Tulemus
      </Link>
    );
  }
  if (gap.indicatorId) {
    return (
      <span className="flex gap-1">
        <Link href={`/moodikud/${gap.indicatorId}#muuda`} className="btn btn-sm whitespace-nowrap">
          Muuda
        </Link>
        <Link
          href={`/tegevused/uus?eesmark=${gap.goalId}&pealkiri=${encodeURIComponent("Algtaseme mõõtmine")}`}
          className="btn btn-sm whitespace-nowrap"
        >
          + Tegevus
        </Link>
      </span>
    );
  }
  return code ? (
    <Link href={`/suunad/${code}`} className="btn btn-sm">
      Ava
    </Link>
  ) : null;
}
