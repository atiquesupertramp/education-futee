import Link from "next/link";
import { Nav } from "@/components/nav";
import { db } from "@/lib/db";
import { demoNow, getSettings } from "@/lib/onboarding";
import { advanceClockAction, runFollowupsAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const now = await demoNow(settings);
  const calls = await db().from("enrollments").select("student_id").eq("status", "a_appeler").is("call_done_at", null);
  const callCount = new Set((calls.data ?? []).map((r) => r.student_id)).size;
  const clock = new Intl.DateTimeFormat("fr-CA", { timeZone: "America/Toronto", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(now);

  return (
    <>
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm text-amber-900">
            <span className="font-semibold">Mode démo</span>
            <span>Aucun courriel ni SMS n&apos;est réellement envoyé.</span>
            <span className="text-amber-800">
              Horloge de la démo : <strong className="font-semibold">{clock}</strong>
              {settings.demo_offset_hours > 0 && <span> (+{settings.demo_offset_hours} h)</span>}
            </span>
            <div className="ml-auto flex gap-2">
              <form action={advanceClockAction}>
                <input type="hidden" name="hours" value="24" />
                <button className="btn btn-secondary py-1 text-xs" title="Simule le passage de 24 heures et déclenche les relances prévues">
                  Avancer de 24 h
                </button>
              </form>
              <form action={runFollowupsAction}>
                <button className="btn btn-secondary py-1 text-xs" title="Exécute maintenant les relances dues">
                  Exécuter les relances
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
          <aside className="md:w-52 md:shrink-0">
            <Link href="/" className="mb-5 flex items-center gap-3 px-3 md:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Éducation Futée" className="h-14 w-auto md:h-auto md:w-36" />
              <span className="block text-xs font-medium text-stone-500 md:mt-2">Intégration des élèves</span>
            </Link>
            <Nav callCount={callCount} />
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
    </>
  );
}
