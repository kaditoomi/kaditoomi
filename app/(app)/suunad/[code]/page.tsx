import Link from "next/link";
import { notFound } from "next/navigation";
import { createDecision } from "@/app/actions/plan";
import { ActivityQuickRow } from "@/components/activity-quick";
import { Field, Select, optionsFrom } from "@/components/fields";
import { ActionForm, SubmitButton } from "@/components/forms";
import { IndicatorHeader, IndicatorRow } from "@/components/indicator-row";
import { StatusBadge } from "@/components/status";
import { canEditDirection, requireUser } from "@/lib/auth";
import { loadPlanModel } from "@/lib/data";
import { DECISION_LABEL, fmtDate, yearLabel } from "@/lib/format";
import type { AttentionItem } from "@/lib/model";

const ATTENTION_ICON: Record<AttentionItem["kind"], string> = { overdue: "⏰", declined: "↓", chain: "⚡", data: "!" };

export default async function DirectionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireUser();
  const model = await loadPlanModel();
  const d = model?.directions.find((x) => x.code === decodeURIComponent(code));
  if (!model || !d) notFound();
  const canEdit = canEditDirection(user, d.id);
  const Y = model.reportYear;
  const s = d.summary;
  const outcomes = d.indicators.filter((i) => i.kind === "outcome");
  const process = d.indicators.filter((i) => i.kind === "process");
  const yearActs = d.activities.filter((a) => a.year === Y || (a.overdue && a.year < Y));
  const otherActs = d.activities.filter((a) => !yearActs.includes(a));
  const profileName = (id: string | null) => model.profiles.find((p) => p.id === id)?.fullName ?? null;
  const nextDue = d.indicators
    .filter((i) => i.data.state === "waiting" && i.data.due)
    .map((i) => i.data.due!)
    .sort()[0];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-ink-3 hover:underline">
          ← Juhtkonna vaade
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-ink-3">SUUND {d.code.replace(/^S/, "")}</span>
              <StatusBadge
                status={d.status}
                label={d.status === "gray" ? (s.waiting > 0 ? "Ootab mõõtmist" : undefined) : undefined}
                title={d.statusReason}
              />
              <span className="text-sm text-ink-3">Õppeaasta {yearLabel(Y)}</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold leading-snug">{d.title}</h1>
            {d.goals.length === 1 && <p className="mt-1 text-sm text-ink-2">Eesmärk: {d.goals[0].title}</p>}
            <details className="mt-2 text-sm">
              <summary className="link text-sm">Näita arengukava teksti (lähtekoht, soovitud muutus, mõju õppijale)</summary>
              <dl className="mt-3 grid gap-4 md:grid-cols-3">
                {[
                  ["Lähtekoht", d.startingPoint],
                  ["Soovitud muutus 2030", d.desiredChange],
                  ["Mõju õppijale", d.learnerImpact],
                ].map(([t, v]) => (
                  <div key={t} className="card p-4">
                    <dt className="h-section mb-1">{t}</dt>
                    <dd className="whitespace-pre-line text-sm text-ink-2">{v || "—"}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/suunad/${d.code}/analuus/${Y}`} className="btn-primary">
              Mõjuanalüüs {yearLabel(Y)}
            </Link>
            {canEdit && (
              <Link href={`/seaded/suunad/${d.code}`} className="btn">
                ⚙ Seadista
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Kokkuvõte: kolm numbrit */}
      <section className="grid gap-4 md:grid-cols-3" aria-label="Kokkuvõte">
        <Tile title={`Tegevuste seis ${yearLabel(Y)}`} href="#tegevused">
          {s.activities.total === 0 ? (
            <span className="text-ink-3">Sel õppeaastal tegevusi pole</span>
          ) : (
            <>
              <b>{s.activities.done}</b> tehtud · <b>{s.activities.inProgress}</b> töös · <b>{s.activities.notStarted}</b> alustamata
              {s.activities.postponed > 0 && <> · {s.activities.postponed} edasi lükatud</>}
            </>
          )}
        </Tile>
        <Tile title="Mõõdikute seis (viimane mõõtmine vs eelmine)" href="#tulemused">
          <span className="text-[#0b7a3a]">
            <b>{s.changes.improved}</b> paranenud
          </span>{" "}
          · <b>{s.changes.unchanged}</b> muutuseta ·{" "}
          <span className="text-s-red">
            <b>{s.changes.declined}</b> langenud
          </span>
          {s.waiting > 0 && (
            <span className="mt-1 block text-xs text-ink-3">
              {s.waiting} ootab mõõtmist{nextDue ? ` · järgmine ${fmtDate(nextDue)}` : ""}
            </span>
          )}
        </Tile>
        <Tile title="Tähelepanu vajab" href="#tahelepanu" accent={s.attention.length > 0}>
          {s.attention.length === 0 ? (
            <span className="text-[#0b7a3a]">Praegu mitte midagi</span>
          ) : (
            <>
              <b>{s.attention.length}</b> {s.attention.length === 1 ? "küsimus" : "küsimust"}
            </>
          )}
        </Tile>
      </section>

      {s.attention.length > 0 && (
        <section id="tahelepanu" className="card border-s-yellow/50 p-5">
          <h2 className="mb-2 text-base font-bold">Tähelepanu vajab</h2>
          <ul className="divide-y divide-line">
            {s.attention.map((a, n) => (
              <li key={n}>
                <Link href={a.href} className="flex items-start gap-3 rounded-lg px-1 py-2.5 hover:bg-surface-2">
                  <span aria-hidden="true" className="w-5 shrink-0 text-center font-bold text-[#9a6400]">
                    {ATTENTION_ICON[a.kind]}
                  </span>
                  <span className="min-w-0">
                    <span className="font-medium">{a.text}</span>
                    <span className="block text-sm text-ink-3">{a.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* A. Kuidas meil läheb? */}
      <section id="tulemused" className="card p-5">
        <SectionTitle letter="A" title="Kuidas meil läheb?" hint="Tulemusnäitajad: algtase, viimane mõõtmine ja siht. Klõpsa mõõdikul, et näha trendi ja lisada tulemus." />
        <IndicatorHeader />
        <ul className="divide-y divide-line">
          {outcomes.map((i) => (
            <IndicatorRow key={i.id} i={i} />
          ))}
          {outcomes.length === 0 && <li className="py-3 text-sm text-ink-3">Tulemusnäitajaid pole veel seadistatud.</li>}
        </ul>
        {process.length > 0 && (
          <details className="mt-4 border-t border-line pt-3">
            <summary className="link text-sm">Protsessinäitajad ({process.length}): kas praktika muutub</summary>
            <ul className="mt-2 divide-y divide-line">
              {process.map((i) => (
                <IndicatorRow key={i.id} i={i} />
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* B. Mida oleme teinud? */}
      <section id="tegevused" className="card p-5">
        <SectionTitle
          letter="B"
          title="Mida oleme teinud?"
          hint={canEdit ? `Tegevused ${yearLabel(Y)}. Klõpsa tegevusel, et seisu uuendada.` : `Tegevused ${yearLabel(Y)}.`}
        />
        <div className="hidden gap-x-4 border-b border-line px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3 sm:grid sm:grid-cols-[minmax(0,1fr)_10rem_7rem_11rem]">
          <span>Tegevus</span>
          <span>Vastutaja</span>
          <span>Tähtaeg</span>
          <span>Seis</span>
        </div>
        <ul className="divide-y divide-line">
          {yearActs.map((a) => (
            <ActivityQuickRow key={a.id} a={a} canEdit={canEdit} showYear={a.year !== Y} />
          ))}
          {yearActs.length === 0 && <li className="px-2 py-3 text-sm text-ink-3">Õppeaastal {yearLabel(Y)} tegevusi pole.</li>}
        </ul>
        {otherActs.length > 0 && (
          <details className="mt-3 border-t border-line pt-3">
            <summary className="link text-sm">Teiste õppeaastate tegevused ({otherActs.length})</summary>
            <ul className="mt-2 divide-y divide-line">
              {otherActs
                .sort((a, b) => a.year - b.year)
                .map((a) => (
                  <ActivityQuickRow key={a.id} a={a} canEdit={canEdit} showYear />
                ))}
            </ul>
          </details>
        )}
      </section>

      {/* C. Mida otsustame? */}
      <section id="otsused" className="card p-5">
        <SectionTitle letter="C" title="Mida otsustame?" hint="Juhtimisotsused: mida jätkame, muudame või millest loobume, kes vastutab ja milleks." />
        {d.decisions.length === 0 ? (
          <p className="text-sm text-ink-3">Otsuseid pole veel tehtud.</p>
        ) : (
          <ul className="divide-y divide-line">
            {d.decisions.slice(0, 3).map((x) => (
              <DecisionItem key={x.id} x={x} owner={profileName(x.ownerId)} />
            ))}
          </ul>
        )}
        {d.decisions.length > 3 && (
          <details className="mt-2">
            <summary className="link text-sm">Varasemad otsused ({d.decisions.length - 3})</summary>
            <ul className="divide-y divide-line">
              {d.decisions.slice(3).map((x) => (
                <DecisionItem key={x.id} x={x} owner={profileName(x.ownerId)} />
              ))}
            </ul>
          </details>
        )}
        {canEdit && (
          <details className="mt-4 rounded-lg border border-line p-4">
            <summary className="font-semibold text-accent-ink">+ Lisa otsus</summary>
            <ActionForm action={createDecision} className="mt-4 grid gap-3 md:grid-cols-4" resetOnSuccess>
              <input type="hidden" name="directionId" value={d.id} />
              <input type="hidden" name="decidedOn" value={model.asOf} />
              <Field label="Otsus" className="md:col-span-4">
                <input name="title" className="input" required placeholder="nt Muudame ainevaldkondade koostöökorraldust, et leida ühine planeerimisaeg" />
              </Field>
              <Field label="Põhjendus (millele otsus tugineb)" className="md:col-span-4">
                <input name="rationale" className="input" placeholder="nt Õpioskuste arenguplaani rakendamine vajab ühist planeerimisaega" />
              </Field>
              <Field label="Vastutaja">
                <Select
                  name="ownerId"
                  empty="—"
                  options={model.profiles.filter((p) => p.role !== "viewer").map((p) => ({ value: p.id, label: p.fullName }))}
                />
              </Field>
              <Field label="Tähtaeg">
                <input type="date" name="dueDate" className="input" />
              </Field>
              <Field label="Liik">
                <Select name="kind" options={optionsFrom(DECISION_LABEL)} defaultValue="change" />
              </Field>
              <Field label="Seotud mõõdik (valikuline)">
                <Select name="indicatorId" empty="—" options={d.indicators.map((i) => ({ value: i.id, label: i.name }))} />
              </Field>
              <div className="md:col-span-4">
                <SubmitButton>Salvesta otsus</SubmitButton>
              </div>
            </ActionForm>
          </details>
        )}
      </section>
    </div>
  );
}

function Tile({ title, href, accent, children }: { title: string; href: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <a href={href} className={`card block p-4 transition hover:border-accent/40 ${accent ? "border-s-yellow/60 bg-s-yellow-bg/40" : ""}`}>
      <p className="h-section mb-1.5">{title}</p>
      <p className="text-[15px] leading-relaxed">{children}</p>
    </a>
  );
}

function SectionTitle({ letter, title, hint }: { letter: string; title: string; hint: string }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-logo-blue text-sm font-bold text-brand">{letter}</span>
      <div>
        <h2 className="text-lg font-bold leading-tight">{title}</h2>
        <p className="text-sm text-ink-3">{hint}</p>
      </div>
    </div>
  );
}

function DecisionItem({
  x,
  owner,
}: {
  x: { id: string; decidedOn: string; kind: keyof typeof DECISION_LABEL; title: string; rationale: string | null; dueDate: string | null };
  owner: string | null;
}) {
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-ink-3">
        <span>{fmtDate(x.decidedOn)}</span>
        <span className="font-bold uppercase text-accent-ink">{DECISION_LABEL[x.kind]}</span>
        {owner && <span>· vastutaja {owner}</span>}
        {x.dueDate && <span>· tähtaeg {fmtDate(x.dueDate)}</span>}
      </div>
      <p className="mt-0.5 font-medium">{x.title}</p>
      {x.rationale && <p className="text-sm text-ink-2">{x.rationale}</p>}
    </li>
  );
}
