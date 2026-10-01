import type { Status } from "@/lib/status";
import { STATUS_LABEL } from "@/lib/format";

// Staatus kantakse alati ikooni kuju + sildiga, mitte ainult värviga.
const STYLE: Record<Status, { fg: string; bg: string }> = {
  green: { fg: "text-s-green", bg: "bg-s-green-bg" },
  yellow: { fg: "text-[#a86f00] dark:text-s-yellow", bg: "bg-s-yellow-bg" },
  red: { fg: "text-s-red", bg: "bg-s-red-bg" },
  gray: { fg: "text-ink-3", bg: "bg-s-gray-bg" },
};

export function StatusIcon({ status, size = 14 }: { status: Status; size?: number }) {
  const color =
    status === "green" ? "var(--s-green)" : status === "yellow" ? "var(--s-yellow)" : status === "red" ? "var(--s-red)" : "var(--s-gray)";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      {status === "green" && (
        <>
          <circle cx="8" cy="8" r="7.5" fill={color} />
          <path d="M4.5 8.2 7 10.6l4.6-5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {status === "yellow" && (
        <>
          <path d="M8 .8 15.4 14.6H.6Z" fill={color} />
          <path d="M8 5.5v4.2" stroke="#1a1a19" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="8" cy="12.2" r="1" fill="#1a1a19" />
        </>
      )}
      {status === "red" && (
        <>
          <rect x=".5" y=".5" width="15" height="15" rx="3" fill={color} />
          <path d="m5 5 6 6M11 5l-6 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
      {status === "gray" && (
        <>
          <circle cx="8" cy="8" r="6.8" fill="none" stroke={color} strokeWidth="1.6" strokeDasharray="2.6 1.8" />
          <path d="M5 8h6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function StatusBadge({ status, label, title }: { status: Status; label?: string; title?: string }) {
  const s = STYLE[status];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${s.bg} ${s.fg}`}
    >
      <StatusIcon status={status} size={12} />
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}

/** Kompaktne: ainult ikoon, silt on title/aria-label kaudu. */
export function StatusDot({ status, title }: { status: Status; title?: string }) {
  return (
    <span role="img" aria-label={`${STATUS_LABEL[status]}${title ? `: ${title}` : ""}`} title={title ?? STATUS_LABEL[status]}>
      <StatusIcon status={status} />
    </span>
  );
}
