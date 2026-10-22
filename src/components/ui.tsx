import type { ReactNode } from "react";
import type { EnrollmentStatus } from "@/lib/types";
import { enrollmentStatusLabel, enrollmentStatusTone } from "@/lib/labels";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatusPill({ status }: { status: EnrollmentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${enrollmentStatusTone[status]}`}>
      {enrollmentStatusLabel[status]}
    </span>
  );
}

export function Pill({ children, tone = "stone" }: { children: ReactNode; tone?: "stone" | "brand" | "amber" | "rose" | "sky" }) {
  const tones = {
    stone: "bg-stone-100 text-stone-700 ring-stone-200",
    brand: "bg-brand-50 text-brand-800 ring-brand-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    rose: "bg-rose-50 text-rose-800 ring-rose-200",
    sky: "bg-sky-50 text-sky-800 ring-sky-200",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-stone-500">{children}</div>;
}
