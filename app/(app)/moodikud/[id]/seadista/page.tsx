import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveIndicator } from "@/app/actions/plan";
import { ActionForm, SubmitButton } from "@/components/forms";
import { IndicatorForm } from "@/components/indicator-form";
import { canEditDirection, requireUser } from "@/lib/auth";
import { loadPlanModel } from "@/lib/data";

// Seadistamine: mõõdiku määratlus (tüüp, allikas, algtase, siht, mõõtmise aeg). Kasutatakse harva.
export default async function IndicatorSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const model = await loadPlanModel();
  const i = model?.indicators.find((x) => x.id === id);
  if (!model || !i) notFound();
  const dir = model.directions.find((d) => d.id === i.directionId)!;
  if (!canEditDirection(user, dir.id)) {
    return <p className="text-sm text-ink-2">Sul pole õigust selle mõõdiku seadistust muuta.</p>;
  }
  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap gap-x-4 text-sm text-ink-3">
        <Link href={`/seaded/suunad/${dir.code}`} className="hover:underline">
          ← Suuna {dir.code} seadistus
        </Link>
        <Link href={`/moodikud/${i.id}`} className="hover:underline">
          Mõõdiku tulemused →
        </Link>
      </div>
      <h1 className="text-2xl font-bold">Seadista mõõdikut</h1>
      <p className="text-sm text-ink-2">{i.name}</p>
      <div className="card p-5">
        <IndicatorForm model={model} goalId={i.goalId} indicator={i} />
      </div>
      <ActionForm action={archiveIndicator} className="card p-5" confirm="Arhiveerida mõõdik? Tulemuste ajalugu säilib.">
        <input type="hidden" name="id" value={i.id} />
        <p className="mb-3 text-sm text-ink-2">Arhiveeritud mõõdikut seirevaates ei näidata; tulemused ja ajalugu säilivad.</p>
        <SubmitButton variant="danger">Arhiveeri mõõdik</SubmitButton>
      </ActionForm>
    </div>
  );
}
