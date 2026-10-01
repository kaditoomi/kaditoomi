import { createIndicator, updateIndicator } from "@/app/actions/plan";
import { DIRECTION_LABEL, KIND_LABEL, LEVEL_LABEL, yearLabel } from "@/lib/format";
import type { PlanModel } from "@/lib/model";
import type { Indicator } from "@/lib/types";
import { Field, Select, optionsFrom } from "./fields";
import { ActionForm, SubmitButton } from "./forms";

export function IndicatorForm({
  model,
  goalId,
  indicator,
  suggestedCode,
}: {
  model: PlanModel;
  goalId: string;
  indicator?: Indicator;
  suggestedCode?: string;
}) {
  const i = indicator;
  const years = [model.plan.baselineYear, ...model.years].map((y) => ({ value: y, label: yearLabel(y) }));
  return (
    <ActionForm action={i ? updateIndicator : createIndicator} className="space-y-4">
      {i ? <input type="hidden" name="id" value={i.id} /> : <input type="hidden" name="goalId" value={goalId} />}
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Kood">
          <input name="code" defaultValue={i?.code ?? suggestedCode} className="input" required />
        </Field>
        <Field label="Mõõdiku nimetus" className="md:col-span-3">
          <input name="name" defaultValue={i?.name} className="input" required />
        </Field>
        <Field label="Mõõdiku tüüp">
          <Select name="kind" options={optionsFrom(KIND_LABEL)} defaultValue={i?.kind ?? "outcome"} />
        </Field>
        <Field label="Mõjutasand" hint="Mida mõõdik näitab mõjuahelas?">
          <Select name="impactLevel" options={optionsFrom(LEVEL_LABEL)} defaultValue={i?.impactLevel ?? "learner_result"} />
        </Field>
        <Field label="Andmeallikas">
          <Select
            name="sourceId"
            empty="— vali —"
            options={model.sources.map((s) => ({ value: s.id, label: s.name }))}
            defaultValue={i?.sourceId}
          />
        </Field>
        <Field label="Ühik" hint="nt %, % nõus, punkti">
          <input name="unit" defaultValue={i?.unit ?? "%"} className="input" required />
        </Field>
      </div>

      <fieldset className="grid gap-3 rounded-md border border-line p-3 md:grid-cols-4">
        <legend className="px-1 text-xs font-semibold text-ink-2">Algtase ja siht</legend>
        <Field label="Trendisuund">
          <Select name="direction" options={optionsFrom(DIRECTION_LABEL)} defaultValue={i?.direction ?? "increase"} />
        </Field>
        <Field label="Algtase" hint="Tühi = algtase puudub (andmelünk)">
          <input name="baselineValue" inputMode="decimal" defaultValue={i?.baselineValue ?? ""} className="input" />
        </Field>
        <Field label="Algtaseme aasta">
          <Select name="baselineYear" empty="—" options={years} defaultValue={i?.baselineYear ?? model.plan.baselineYear} />
        </Field>
        <Field label={`Sihttase`}>
          <input name="targetValue" inputMode="decimal" defaultValue={i?.targetValue ?? ""} className="input" />
        </Field>
        <Field label="Sihi aasta">
          <Select name="targetYear" options={years} defaultValue={i?.targetYear ?? model.plan.endYear} />
        </Field>
        <Field label="Staatusereegel">
          <Select
            name="statusRuleId"
            empty="Vaikereegel"
            options={model.rules.map((r) => ({
              value: r.id,
              label: `${r.name} (${r.greenMinPct}/${r.yellowMinPct}${r.maintainTolerance ? `, ±${r.maintainTolerance}` : ""})`,
            }))}
            defaultValue={i?.statusRuleId}
          />
        </Field>
        <Field label="Algtaseme märkus" className="md:col-span-2">
          <input name="baselineNote" defaultValue={i?.baselineNote ?? ""} className="input" />
        </Field>
      </fieldset>

      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Mõõdiku vastutaja">
          <Select
            name="ownerId"
            empty="—"
            options={model.profiles.filter((p) => p.role !== "viewer").map((p) => ({ value: p.id, label: p.fullName }))}
            defaultValue={i?.ownerId}
          />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="isKey" defaultChecked={i?.isKey} /> Võtmenäitaja (mõjutab suuna üldstaatust)
        </label>
        <Field label="Selgitav kommentaar" className="md:col-span-4">
          <textarea name="description" defaultValue={i?.description ?? ""} rows={2} className="input" />
        </Field>
      </div>
      <SubmitButton>{i ? "Salvesta mõõdik" : "Loo mõõdik"}</SubmitButton>
    </ActionForm>
  );
}
