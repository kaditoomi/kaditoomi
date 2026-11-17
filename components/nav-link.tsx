"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Päise menüüpunkt; aktiivne leht on esile tõstetud logo helesinisega (#bfd8ef).
export function NavLink({ href, title, children }: { href: string; title?: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      title={title}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition ${
        active ? "bg-logo-blue font-semibold text-brand" : "text-white/90 hover:bg-white/12 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
