import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityForm } from "@/components/activity-form";
import { PlanContext } from "@/components/plan-context";
import { canEditDirection, requireUser } from "@/lib/auth";
import { loadPlanModel } from "@/lib/data";

export default async function NewActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ eesmark?: string; pealkiri?: string }>;
}) {
  const { eesmark, pealkiri } = await searchParams;
  const user = await requireUser();
  const model = await loadPlanModel();
  const dir = model?.directions.find((d) => d.goals.some((g) => g.id === eesmark));
  const goal = dir?.goals.find((g) => g.id === eesmark);
  if (!model || !dir || !goal) notFound();
  if (!canEditDirection(user, dir.id)) {
    return <p className="text-sm text-ink-2">Sul pole õigust selle arengusuuna tegevusi lisada.</p>;
  }
  const nextYear = Math.min(model.reportYear + 1, model.plan.endYear);
  return (
    <div className="space-y-4">
      <Link href={`/suunad/${dir.code}#tegevused`} className="text-sm text-ink-3 hover:underline">
        ← {dir.code}
      </Link>
      <h1 className="text-2xl font-bold">Uus tegevus</h1>
      <p className="text-sm text-ink-2">
        Eesmärk: <strong>{goal.code}</strong> {goal.title}
      </p>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card p-4">
          <ActivityForm model={model} dir={dir} goalId={goal.id} defaultTitle={pealkiri} />
        </div>
        <PlanContext dir={dir} year={nextYear} />
      </div>
    </div>
  );
}
