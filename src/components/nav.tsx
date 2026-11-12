"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0" aria-hidden>
    <path d={d} />
  </svg>
);

const LINKS: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/", label: "Tableau de bord", icon: icon("M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10") },
  { href: "/eleves/nouveau", label: "Nouvel élève", icon: icon("M12 5v14M5 12h14") },
  { href: "/eleves", label: "Élèves", icon: icon("M16 19v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 19v-1a3.5 3.5 0 00-2.5-3.3M16.5 4.2a3.5 3.5 0 010 6.6") },
  { href: "/eleves/import", label: "Importer des élèves", icon: icon("M12 16V4M7 9l5-5 5 5M4 20h16") },
  { href: "/a-appeler", label: "À appeler", icon: icon("M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z") },
  { href: "/messages", label: "Boîte d'envoi", icon: icon("M3 7l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z") },
  { href: "/modeles", label: "Modèles de courriel", icon: icon("M4 5h16M4 10h16M4 15h10M4 20h7") },
  { href: "/groupes", label: "Groupes", icon: icon("M4 6h16M4 12h16M4 18h16") },
  { href: "/parametres", label: "Paramètres", icon: icon("M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z") },
];

export function Nav({ callCount }: { callCount: number }) {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : href === "/eleves" ? path === "/eleves" || (path.startsWith("/eleves/") && path !== "/eleves/nouveau" && !path.startsWith("/eleves/import")) : path.startsWith(href);
  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0" aria-label="Navigation principale">
      {LINKS.map((l) => {
        const active = isActive(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              active ? "bg-brand-50 text-brand-800 ring-1 ring-brand-100" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <span className={active ? "text-brand-700" : "text-stone-400"}>{l.icon}</span>
            <span className="flex-1">{l.label}</span>
            {l.href === "/a-appeler" && callCount > 0 && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">{callCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
