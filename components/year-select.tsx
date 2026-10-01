"use client";

import { usePathname } from "next/navigation";
import { setReportYear } from "@/app/actions/session";

export function YearSelect({ years, value }: { years: number[]; value: number }) {
  const pathname = usePathname();
  return (
    <form action={setReportYear} className="flex items-center gap-1.5 text-sm">
      <input type="hidden" name="back" value={pathname} />
      <label htmlFor="aruandeaasta" className="text-ink-3">
        Aruandeaasta
      </label>
      <select
        id="aruandeaasta"
        name="year"
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-line bg-surface px-2 py-1 text-sm"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y - 1}/{String(y).slice(2)}
          </option>
        ))}
      </select>
      <noscript>
        <button className="btn btn-sm">Vali</button>
      </noscript>
    </form>
  );
}
