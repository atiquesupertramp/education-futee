import type { ReactNode } from "react";
import type { EnrollmentStatus } from "@/lib/types";
import { enrollmentStatusLabel, enrollmentStatusTone } from "@/lib/labels";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[1.65rem] font-bold tracking-tight text-stone-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-stone-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatusPill({ status }: { status: EnrollmentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${enrollmentStatusTone[status]}`}>
      {enrollmentStatusLabel[status]}
    </span>
  );
}

export function Pill({ children, tone = "stone" }: { children: ReactNode; tone?: "stone" | "brand" | "amber" | "rose" | "sky" | "emerald" }) {
  const tones = {
    stone: "bg-stone-100 text-stone-700 ring-stone-200",
    brand: "bg-brand-50 text-brand-800 ring-brand-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    rose: "bg-rose-50 text-rose-800 ring-rose-200",
    sky: "bg-sky-50 text-sky-800 ring-sky-200",
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-12 text-center text-sm text-stone-500">{children}</div>;
}

export function Avatar({ name }: { name: string }) {
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-sm font-bold text-brand-800">
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
