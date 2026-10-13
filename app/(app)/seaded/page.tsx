import { createDirection, createSource, saveRule, setDirectionOwners, updateProfile } from "@/app/actions/plan";
import { Field, Select, optionsFrom } from "@/components/fields";
import { ActionForm, SubmitButton } from "@/components/forms";
import { requireAdmin } from "@/lib/auth";
import { loadPlanModel } from "@/lib/data";
import { ROLE_LABEL, SOURCE_KIND_LABEL } from "@/lib/format";
import type { StatusRuleRow } from "@/lib/types";

export default async function SettingsPage() {
  const user = await requireAdmin();
  const model = (await loadPlanModel())!;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Seaded</h1>

      <Section title="Kasutajad ja rollid">
        <p className="mb-3 text-sm text-ink-2">
          Uue kasutaja lisamiseks kutsu ta Supabase&apos;is (Authentication → Users → Invite user). Esimesel sisselogimisel saab
          ta rolli „vaatleja“; seejärel määra siin roll. Eemalda linnuke „Aktiivne“, et ligipääs peatada. Vastutaja muudab ainult nende arengusuundade andmeid, mille
          vastutajaks ta on määratud.
        </p>
        <div className="overflow-x-auto">
          <table className="table-basic min-w-[640px]">
            <thead>
              <tr>
                <th>Nimi</th>
                <th>E-post</th>
                <th>Roll</th>
                <th>Ligipääs</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {model.profiles.map((p) => (
                <tr key={p.id}>
                  <td colSpan={5} className="p-0">
                    <ActionForm action={updateProfile} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-center gap-2 px-2 py-1.5">
                      <input type="hidden" name="id" value={p.id} />
                      <input name="fullName" defaultValue={p.fullName} className="input" required aria-label="Nimi" />
                      <span className="truncate text-sm text-ink-2">{p.email ?? "—"}</span>
                      <Select name="role" options={optionsFrom(ROLE_LABEL)} defaultValue={p.role} />
                      <label className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" name="isActive" defaultChecked={p.isActive} /> Aktiivne
                      </label>
                      <SubmitButton small variant="default">
                        Salvesta
                      </SubmitButton>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-3">Sina: {user.fullName}. Enda administraatoriõigust ei saa eemaldada.</p>
      </Section>

      <Section title="Arengusuundade vastutajad">
        <div className="grid gap-4 md:grid-cols-3">
          {model.directions.map((d) => (
            <ActionForm key={d.id} action={setDirectionOwners} className="rounded-md border border-line p-3">
              <input type="hidden" name="directionId" value={d.id} />
              <p className="text-sm font-semibold">
                {d.code} <span className="font-normal text-ink-2">{d.title}</span>
              </p>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-xs text-ink-3">
                    <th className="text-left font-medium">Vastutaja</th>
                    <th className="w-20 font-medium">Peavastutaja</th>
                  </tr>
                </thead>
                <tbody>
                  {model.profiles
                    .filter((p) => p.role !== "admin")
                    .map((p) => {
                      const o = d.owners.find((x) => x.userId === p.id);
                      return (
                        <tr key={p.id}>
                          <td>
                            <label className="flex items-center gap-2">
                              <input type="checkbox" name="userId" value={p.id} defaultChecked={!!o} />
                              {p.fullName}
                            </label>
                          </td>
                          <td className="text-center">
                            <input type="radio" name="leadId" value={p.id} defaultChecked={o?.isLead} aria-label={`${p.fullName} peavastutaja`} />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              <div className="mt-2">
                <SubmitButton small>Salvesta</SubmitButton>
              </div>
            </ActionForm>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-3">Administraator saab muuta kõiki suundi ega vaja vastutaja määramist.</p>
      </Section>

      <Section title="Lisa arengusuund">
        <ActionForm action={createDirection} className="grid gap-3 md:grid-cols-4" resetOnSuccess>
          <Field label="Kood">
            <input name="code" className="input" required placeholder={`S${model.directions.length + 1}`} />
          </Field>
          <Field label="Eesmärgi nimetus" className="md:col-span-3">
            <input name="title" className="input" required />
          </Field>
          <Field label="Lähtekoht">
            <textarea name="startingPoint" className="input" rows={2} />
          </Field>
          <Field label="Soovitud muutus">
            <textarea name="desiredChange" className="input" rows={2} />
          </Field>
          <Field label="Mõju õppijale">
            <textarea name="learnerImpact" className="input" rows={2} />
          </Field>
          <div className="flex items-end">
            <SubmitButton>Lisa arengusuund</SubmitButton>
          </div>
        </ActionForm>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Andmeallikad">
          <ul className="mb-3 divide-y divide-line text-sm">
            {model.sources.map((s) => (
              <li key={s.id} className="flex justify-between gap-2 py-1.5">
                <span>{s.name}</span>
                <span className="text-xs text-ink-3">{SOURCE_KIND_LABEL[s.kind]}</span>
              </li>
            ))}
          </ul>
          <ActionForm action={createSource} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]" resetOnSuccess>
            <input name="name" placeholder="Uus andmeallikas" className="input" required />
            <Select name="kind" options={optionsFrom(SOURCE_KIND_LABEL)} defaultValue="survey" />
            <SubmitButton small>Lisa</SubmitButton>
          </ActionForm>
        </Section>

        <Section title="Staatusereeglid">
          <p className="mb-3 text-sm text-ink-2">
            Protsent tähendab: mitu % <em>planeeritud</em> arengust (lineaarne algtasemest sihini) on aruandeaastaks saavutatud.
          </p>
          <div className="space-y-3">
            {model.rules.map((r) => (
              <RuleForm key={r.id} rule={r} />
            ))}
            <details>
              <summary className="cursor-pointer text-sm font-medium">+ Uus reegel</summary>
              <div className="mt-2">
                <RuleForm />
              </div>
            </details>
          </div>
        </Section>
      </div>
    </div>
  );
}

function RuleForm({ rule }: { rule?: StatusRuleRow }) {
  return (
    <ActionForm action={saveRule} className="rounded-md border border-line p-3" resetOnSuccess={!rule}>
      {rule && <input type="hidden" name="id" value={rule.id} />}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Field label={`Nimi${rule?.isDefault ? " (vaikereegel)" : ""}`} className="col-span-2 md:col-span-4">
          <input name="name" defaultValue={rule?.name} className="input" required />
        </Field>
        <Field label="Roheline alates %">
          <input name="greenMinPct" defaultValue={rule?.greenMinPct ?? 75} inputMode="decimal" className="input" required />
        </Field>
        <Field label="Kollane alates %">
          <input name="yellowMinPct" defaultValue={rule?.yellowMinPct ?? 40} inputMode="decimal" className="input" required />
        </Field>
        <Field label="Säilimise tolerants" hint="mõõdiku ühikutes">
          <input name="maintainTolerance" defaultValue={rule?.maintainTolerance ?? 0} inputMode="decimal" className="input" />
        </Field>
        <label className="flex items-center gap-2 self-center text-sm">
          <input type="checkbox" name="redOnNegative" defaultChecked={rule?.redOnNegative ?? true} />
          Vales suunas = punane
        </label>
      </div>
      <div className="mt-2">
        <SubmitButton small>{rule ? "Salvesta" : "Lisa reegel"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
