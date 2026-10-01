import Link from "next/link";
import { notFound } from "next/navigation";
import { IndicatorForm } from "@/components/indicator-form";
import { canEditDirection, requireUser } from "@/lib/auth";
import { loadPlanModel } from "@/lib/data";

export default async function NewIndicatorPage({ searchParams }: { searchParams: Promise<{ eesmark?: string }> }) {
  const { eesmark } = await searchParams;
  const user = await requireUser();
  const model = await loadPlanModel();
  const dir = model?.directions.find((d) => d.goals.some((g) => g.id === eesmark));
  const goal = dir?.goals.find((g) => g.id === eesmark);
  if (!model || !dir || !goal) notFound();
  if (!canEditDirection(user, dir.id)) {
    return <p className="text-sm text-ink-2">Sul pole õigust selle arengusuuna mõõdikuid lisada.</p>;
  }
  const n = goal.indicators.length + 1;
  return (
    <div className="max-w-4xl space-y-4">
      <Link href={`/suunad/${dir.code}`} className="text-sm text-ink-3 hover:underline">
        ← {dir.code}
      </Link>
      <h1 className="text-xl font-semibold">Uus mõõdik</h1>
      <p className="text-sm text-ink-2">
        Eesmärk: <strong>{goal.code}</strong> {goal.title}
      </p>
      <div className="card p-4">
        <IndicatorForm model={model} goalId={goal.id} suggestedCode={`${goal.code}-${n}`} />
      </div>
    </div>
  );
}
