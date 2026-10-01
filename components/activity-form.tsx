import { createActivity, updateActivity } from "@/app/actions/plan";
import { ACTIVITY_LABEL, yearLabel } from "@/lib/format";
import type { DirectionView, PlanModel } from "@/lib/model";
import type { Activity } from "@/lib/types";
import { Field, Select, optionsFrom } from "./fields";
import { ActionForm, SubmitButton } from "./forms";

export function ActivityForm({
  model,
  dir,
  goalId,
  activity,
  linked = [],
  defaultTitle,
}: {
  model: PlanModel;
  dir: DirectionView;
  goalId: string;
  activity?: Activity;
  linked?: string[];
  defaultTitle?: string;
}) {
  const a = activity;
  return (
    <ActionForm action={a ? updateActivity : createActivity} className="space-y-4">
      {a ? <input type="hidden" name="id" value={a.id} /> : <input type="hidden" name="goalId" value={goalId} />}
      <Field label="Tegevus">
        <input name="title" defaultValue={a?.title ?? defaultTitle} className="input" required />
      </Field>
      <Field label="Kirjeldus">
        <textarea name="description" defaultValue={a?.description ?? ""} rows={2} className="input" />
      </Field>
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Tegevuskava aasta">
          <Select
            name="year"
            options={model.years.map((y) => ({ value: y, label: yearLabel(y) }))}
            defaultValue={a?.year ?? Math.min(model.reportYear + 1, model.plan.endYear)}
          />
        </Field>
        <Field label="Vastutaja">
          <Select
            name="ownerId"
            empty="—"
            options={model.profiles.filter((p) => p.role !== "viewer").map((p) => ({ value: p.id, label: p.fullName }))}
            defaultValue={a?.ownerId}
          />
        </Field>
        <Field label="Algus">
          <input type="date" name="startDate" defaultValue={a?.startDate ?? ""} className="input" />
        </Field>
        <Field label="Tähtaeg">
          <input type="date" name="dueDate" defaultValue={a?.dueDate ?? ""} className="input" />
        </Field>
        <Field label="Seis">
          <Select name="status" options={optionsFrom(ACTIVITY_LABEL)} defaultValue={a?.status ?? "planned"} />
        </Field>
        <Field label="Toimumise kuupäev" hint="Kohustuslik, kui tehtud">
          <input type="date" name="completedOn" defaultValue={a?.completedOn ?? ""} className="input" />
        </Field>
        <Field label="Mis tegelikult toimus" className="md:col-span-2">
          <input name="outcomeNote" defaultValue={a?.outcomeNote ?? ""} className="input" placeholder="nt 58 õpetajat osales" />
        </Field>
      </div>
      <fieldset className="rounded-md border border-line p-3">
        <legend className="px-1 text-xs font-semibold text-ink-2">Millist mõõdikut see tegevus peaks mõjutama?</legend>
        <div className="grid gap-1 md:grid-cols-2">
          {dir.indicators.map((i) => (
            <label key={i.id} className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="indicatorId" value={i.id} defaultChecked={linked.includes(i.id)} className="mt-1" />
              <span>
                <span className="text-ink-3">{i.code}</span> {i.name}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton>{a ? "Salvesta tegevus" : "Lisa tegevus"}</SubmitButton>
    </ActionForm>
  );
}
