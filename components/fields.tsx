import type { ReactNode } from "react";

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

export function Select({
  name,
  defaultValue,
  options,
  empty,
  required,
}: {
  name: string;
  defaultValue?: string | number | null;
  options: { value: string | number; label: string }[];
  empty?: string;
  required?: boolean;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className="input" required={required}>
      {empty !== undefined && <option value="">{empty}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export const optionsFrom = <T extends string>(labels: Record<T, string>) =>
  (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
