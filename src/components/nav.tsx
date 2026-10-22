"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/eleves/nouveau", label: "Nouvel élève" },
  { href: "/eleves", label: "Élèves" },
  { href: "/a-appeler", label: "À appeler" },
  { href: "/messages", label: "Boîte d'envoi" },
  { href: "/groupes", label: "Groupes" },
  { href: "/parametres", label: "Paramètres" },
];

export function Nav({ callCount }: { callCount: number }) {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : href === "/eleves" ? path === "/eleves" || (path.startsWith("/eleves/") && path !== "/eleves/nouveau") : path.startsWith(href);
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap ${
            isActive(l.href) ? "bg-brand-700 text-white" : "text-stone-700 hover:bg-stone-200/60"
          }`}
        >
          {l.label}
          {l.href === "/a-appeler" && callCount > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isActive(l.href) ? "bg-white/20 text-white" : "bg-rose-100 text-rose-800"}`}>{callCount}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
