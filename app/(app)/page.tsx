import Link from "next/link";
import { notFound } from "next/navigation";
import { ChangeBadge, DataChip } from "@/components/signals";
import { StatusBadge } from "@/components/status";
import { loadPlanModel } from "@/lib/data";
import { DECISION_LABEL, fmtDate, fmtNum, yearLabel } from "@/lib/format";
import type { AttentionItem, DirectionView, IndicatorView, PlanModel } from "@/lib/model";

/** Juhtkonna vaade: mis on muutunud, mis ei ole ja mida peame teisiti tegema. */
export default async function DashboardPage() {
  const model = await loadPlanModel();
  if (!model) notFound();
  const { directions, reportYear } = model;
  const dirCode = new Map(directions.map((d) => [d.id, d.code]));
  const outcomes = model.indicators.filter((i) => i.kind === "outcome");
  const improved = outcomes.filter((i) => i.change === "improved");
  const declined = outcomes.filter((i) => i.change === "declined");
  const unchanged = outcomes.filter((i) => i.change === "unchanged");
  const waiting = model.indicators.filter((i) => i.data.state === "waiting").length;
  const profileName = (id: string | null) => model.profiles.find((p) => p.id === id)?.fullName;
  const openDecisions = model.decisions.filter((x) => x.dueDate && x.dueDate >= model.asOf);

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
          <DirectionCard key={d.id} d={d} />
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Mis on muutunud?" hint="Tulemusmõõdikud, mille viimane mõõtmine erines eelmisest.">
          {improved.length + declined.length === 0 ? (
            <Empty>Ühegi tulemusmõõdiku viimane mõõtmine ei erinenud eelmisest.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {[...declined, ...improved].map((i) => (
                <ChangeRow key={i.id} i={i} code={dirCode.get(i.directionId)} />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Mis ei ole muutunud?" hint="Muutus alla läve (skaalal 0,1, protsentides 2 p.p.).">
          {unchanged.length === 0 ? (
            <Empty>Muutuseta mõõdikuid pole.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {unchanged.map((i) => (
                <ChangeRow key={i.id} i={i} code={dirCode.get(i.directionId)} />
              ))}
            </ul>
          )}
          {waiting > 0 && (
            <p className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-xs text-ink-3">
              <DataChip state="waiting" reason="" /> {waiting} mõõdikut ootab planeeritud mõõtmist — need ei ole lüngad.
            </p>
          )}
        </Panel>

        <Panel title="Mida peame teisiti tegema?" hint="Mis vajab tähelepanu ja mis on juba otsustatud.">
          {model.attentionItems.length === 0 ? (
            <Empty>Midagi ei vaja praegu erilist tähelepanu.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {model.attentionItems.slice(0, 8).map((a, idx) => (
                <AttentionRow key={idx} a={a} code={dirCode.get(a.directionId)} />
              ))}
            </ul>
          )}
          {model.attentionItems.length > 8 && (
            <p className="pt-1 text-xs text-ink-3">ja veel {model.attentionItems.length - 8} — vaata suuna lehelt.</p>
          )}
          <div className="mt-3 border-t border-line pt-3">
            <p className="h-section mb-1.5">Viimased otsused</p>
            {model.decisions.length === 0 ? (
              <Empty>Otsuseid pole veel lisatud. Otsuse saab lisada suuna lehel.</Empty>
            ) : (
              <ul className="space-y-2">
                {model.decisions.slice(0, 4).map((x) => (
                  <li key={x.id} className="text-sm">
                    <Link href={`/suunad/${dirCode.get(x.directionId)}#otsused`} className="hover:underline">
                      <span className="text-xs font-semibold text-ink-3">{dirCode.get(x.directionId)}</span>{" "}
                      <span className="text-xs font-semibold uppercase text-accent-ink">{DECISION_LABEL[x.kind]}</span> {x.title}
                    </Link>
                    <span className="block text-xs text-ink-3">
                      {fmtDate(x.decidedOn)}
                      {profileName(x.ownerId) && ` · vastutaja ${profileName(x.ownerId)}`}
                      {x.dueDate && ` · tähtaeg ${fmtDate(x.dueDate)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {openDecisions.length > 0 && (
              <p className="mt-2 text-xs text-ink-3">{openDecisions.length} otsuse tähtaeg on veel ees.</p>
            )}
          </div>
        </Panel>
      </div>

      <AnalysisLine model={model} />
    </div>
  );
}

function DirectionCard({ d }: { d: DirectionView }) {
  const s = d.summary;
  const allWaiting = d.status === "gray" && s.waiting > 0;
  return (
    <article className="card flex flex-col p-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/suunad/${d.code}`} className="text-sm font-semibold hover:underline">
          {d.code}
        </Link>
        {allWaiting ? <DataChip state="waiting" reason="Tulemusmõõdikute esimesed mõõtmised on veel ees" /> : <StatusBadge status={d.status} title={d.statusReason} />}
      </div>
      <h2 className="mt-1 text-[15px] font-semibold leading-snug">
        <Link href={`/suunad/${d.code}`} className="hover:underline">
          {d.title}
        </Link>
      </h2>
      <p className="mt-0.5 text-xs text-ink-3">Vastutaja: {d.owners.map((o) => o.fullName).join(", ") || "määramata"}</p>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Tile label="Tegevused">
          {s.activities.done}/{s.activities.total}
          <span className="block text-[11px] font-normal text-ink-3">valmis/rakendunud</span>
        </Tile>
        <Tile label="Mõõdikud">
          <span className="text-[#0b7a3a]">↑{s.changes.improved}</span> <span className="text-ink-2">→{s.changes.unchanged}</span>{" "}
          <span className="text-s-red">↓{s.changes.declined}</span>
          <span className="block text-[11px] font-normal text-ink-3">{s.waiting} ootab mõõtmist</span>
        </Tile>
        <Tile label="Tähelepanu">
          <span className={s.attention.length > 0 ? "text-[#9a6400]" : ""}>{s.attention.length}</span>
          <span className="block text-[11px] font-normal text-ink-3">{s.attention.length === 1 ? "asi" : "asja"}</span>
        </Tile>
      </dl>

      <div className="mt-4 space-y-2 border-t border-line pt-3">
        <p className="h-section">Võtmenäitajad</p>
        {d.keyIndicators.length === 0 && <p className="text-xs text-ink-3">Võtmenäitajat pole määratud.</p>}
        {d.keyIndicators.slice(0, 4).map((i) => (
          <Link key={i.id} href={`/moodikud/${i.id}`} className="flex items-center justify-between gap-2 rounded px-1 py-0.5 text-sm hover:bg-surface-2">
            <span className="min-w-0 truncate" title={i.name}>
              {i.name}
            </span>
            <span className="flex shrink-0 items-center gap-2 tabular-nums">
              {i.last ? <span className="font-semibold">{fmtNum(i.last.value)}</span> : <span className="text-ink-3">—</span>}
              {i.data.state === "waiting" && !i.last ? <DataChip state="waiting" reason={i.data.reason} /> : <ChangeBadge change={i.change} />}
            </span>
          </Link>
        ))}
      </div>
      <Link href={`/suunad/${d.code}`} className="link mt-auto pt-3 text-sm">
        Ava suund →
      </Link>
    </article>
  );
}

function ChangeRow({ i, code }: { i: IndicatorView; code?: string }) {
  return (
    <li className="py-2">
      <Link href={`/moodikud/${i.id}`} className="flex items-start justify-between gap-3 text-sm hover:underline">
        <span className="min-w-0">
          <span className="text-xs font-semibold text-ink-3">{code}</span> {i.name}
          {i.prev && i.last && (
            <span className="block text-xs tabular-nums text-ink-3">
              {yearLabel(i.prev.year)} {fmtNum(i.prev.value)} → {yearLabel(i.last.year)} {fmtNum(i.last.value)} · siht {fmtNum(i.targetValue)}
            </span>
          )}
        </span>
        <ChangeBadge change={i.change} />
      </Link>
    </li>
  );
}

const ATTENTION_ICON: Record<AttentionItem["kind"], string> = {
  overdue: "⏰",
  declined: "↓",
  chain: "⚡",
  data: "!",
};

function AttentionRow({ a, code }: { a: AttentionItem; code?: string }) {
  return (
    <li className="py-2">
      <Link href={a.href} className="flex items-start gap-2 text-sm hover:underline">
        <span aria-hidden="true" className="w-4 shrink-0 text-center text-[#9a6400]">
          {ATTENTION_ICON[a.kind]}
        </span>
        <span className="min-w-0">
          <span className="text-xs font-semibold text-ink-3">{code}</span> {a.text}
          <span className="block text-xs text-ink-3">{a.detail}</span>
        </span>
      </Link>
    </li>
  );
}

function AnalysisLine({ model }: { model: PlanModel }) {
  const y = model.reportYear;
  return (
    <section className="card flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
      <span className="h-section">Mõjuanalüüs {yearLabel(y)}</span>
      {model.directions.map((d) => {
        const a = d.analyses.find((x) => x.year === y);
        return (
          <Link key={d.id} href={`/suunad/${d.code}/analuus/${y}`} className="link">
            {d.code}: {a ? (a.status === "approved" ? "✓ kinnitatud" : "mustand — ootab kinnitamist") : "alustamata"}
          </Link>
        );
      })}
    </section>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-surface-2/70 px-2 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-lg font-bold tabular-nums">{children}</dd>
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="text-base font-bold">{title}</h2>
      <p className="mb-2 text-xs text-ink-3">{hint}</p>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-ink-3">{children}</p>;
}
