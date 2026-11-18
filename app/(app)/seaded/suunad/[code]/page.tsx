import Link from "next/link";
import { notFound } from "next/navigation";
import { createGoal, updateDirection, updateGoal } from "@/app/actions/plan";
import { Field } from "@/components/fields";
import { ActionForm, SubmitButton } from "@/components/forms";
import { canEditDirection, requireUser } from "@/lib/auth";
import { loadPlanModel } from "@/lib/data";
import { ACTIVITY_KIND_LABEL, KIND_LABEL, MONTH_LABEL, activityStatusLabel, fmtDate, fmtNum, yearLabel } from "@/lib/format";

// Seadistamise vaade: arengusuuna kirjeldus, eesmärgid, mõõdikute määratlused ja tegevuskava.
// Igapäevane seire (tulemused, seisud, otsused) toimub arengusuuna lehel.
export default async function DirectionSetupPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireUser();
  const model = await loadPlanModel();
  const d = model?.directions.find((x) => x.code === decodeURIComponent(code));
  if (!model || !d) notFound();
  if (!canEditDirection(user, d.id)) {
    return <p className="text-sm text-ink-2">Sul pole õigust selle arengusuuna seadistust muuta.</p>;
  }
  return (
    <div className="space-y-6">
      <div>
        <Link href={`/suunad/${d.code}`} className="text-sm text-ink-3 hover:underline">
          ← Tagasi seirevaatesse ({d.code})
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Seadistus: {d.code}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-2">
          Siin muudetakse arengukava ülesehitust: kirjeldust, eesmärke, mõõdikute määratlusi (algtase, siht, mõõtmise aeg) ja
          tegevuskava. Seda kasutatakse harva. Tulemuste ja tegevuste seisu sisestamine käib seirevaates.
        </p>
      </div>

      <details className="card p-5">
        <summary className="text-lg font-bold">Arengusuuna kirjeldus</summary>
        <ActionForm action={updateDirection} className="mt-4 grid gap-3">
          <input type="hidden" name="id" value={d.id} />
          <Field label="Arengusuuna nimetus">
            <input name="title" defaultValue={d.title} className="input" required />
          </Field>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Lähtekoht">
              <textarea name="startingPoint" defaultValue={d.startingPoint ?? ""} rows={6} className="input" />
            </Field>
            <Field label="Soovitud muutus">
              <textarea name="desiredChange" defaultValue={d.desiredChange ?? ""} rows={6} className="input" />
            </Field>
            <Field label="Mõju õppijale">
              <textarea name="learnerImpact" defaultValue={d.learnerImpact ?? ""} rows={6} className="input" />
            </Field>
          </div>
          <div>
            <SubmitButton>Salvesta kirjeldus</SubmitButton>
          </div>
        </ActionForm>
      </details>

      {d.goals.map((g) => (
        <section key={g.id} className="card space-y-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-bold">
              <span className="text-ink-3">{g.code}</span> {g.title}
            </h2>
            <div className="flex gap-2">
              <Link href={`/moodikud/uus?eesmark=${g.id}`} className="btn btn-sm">
                + Mõõdik
              </Link>
              <Link href={`/tegevused/uus?eesmark=${g.id}`} className="btn btn-sm">
                + Tegevus
              </Link>
            </div>
          </div>

          <details>
            <summary className="link text-sm">Muuda eesmärki</summary>
            <ActionForm action={updateGoal} className="mt-3 grid gap-3 md:grid-cols-2">
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

          <div>
            <h3 className="h-section mb-2">Mõõdikud ({g.indicators.length})</h3>
            <div className="overflow-x-auto">
              <table className="table-basic min-w-[720px]">
                <thead>
                  <tr>
                    <th>Mõõdik</th>
                    <th>Tüüp</th>
                    <th className="text-right">Algtase</th>
                    <th className="text-right">Siht</th>
                    <th>Mõõtmine</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {g.indicators.map((i) => (
                    <tr key={i.id}>
                      <td>
                        {i.isKey && "★ "}
                        {i.name}
                        <span className="block text-xs text-ink-3">
                          {i.code} · {i.source?.name ?? "allikas määramata"}
                        </span>
                      </td>
                      <td className="text-xs text-ink-2">{KIND_LABEL[i.kind]}</td>
                      <td className="text-right tabular-nums">{fmtNum(i.baselineValue)}</td>
                      <td className="text-right tabular-nums">{fmtNum(i.targetValue)}</td>
                      <td className="text-xs text-ink-2">
                        igal aastal {MONTH_LABEL[(i.measurementMonth ?? 6) - 1]}
                        {i.baselineValue == null && i.firstMeasurementDue && (
                          <span className="block">algtase {fmtDate(i.firstMeasurementDue)}</span>
                        )}
                      </td>
                      <td className="text-right">
                        <Link href={`/moodikud/${i.id}/seadista`} className="btn btn-sm">
                          Muuda
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="h-section mb-2">Tegevuskava ({g.activities.length})</h3>
            <ul className="divide-y divide-line">
              {g.activities
                .slice()
                .sort((a, b) => a.year - b.year)
                .map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span className="min-w-0">
                      {a.title}
                      <span className="block text-xs text-ink-3">
                        {yearLabel(a.year)} · {ACTIVITY_KIND_LABEL[a.kind ?? "milestone"]} ·{" "}
                        {a.dueDate ? `tähtaeg ${fmtDate(a.dueDate)}` : "tähtaeg määramata"} · {activityStatusLabel(a.kind ?? "milestone", a.status)}
                      </span>
                    </span>
                    <Link href={`/tegevused/${a.id}`} className="btn btn-sm">
                      Muuda
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </section>
      ))}

      <details className="card p-5">
        <summary className="font-semibold text-accent-ink">+ Lisa eesmärk</summary>
        <ActionForm action={createGoal} className="mt-4 grid gap-3 md:grid-cols-2" resetOnSuccess>
          <input type="hidden" name="directionId" value={d.id} />
          <Field label="Kood">
            <input name="code" className="input" required placeholder={`E${d.code.replace(/^S/, "")}.${d.goals.length + 1}`} />
          </Field>
          <Field label="Eesmärk">
            <input name="title" className="input" required />
          </Field>
          <div>
            <SubmitButton>Lisa eesmärk</SubmitButton>
          </div>
        </ActionForm>
      </details>
    </div>
  );
}
