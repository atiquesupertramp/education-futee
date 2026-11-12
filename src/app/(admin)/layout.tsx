import Link from "next/link";
import { Nav } from "@/components/nav";
import { db } from "@/lib/db";
import { demoNow, getSettings } from "@/lib/onboarding";
import { logoutAction } from "../login/actions";
import { advanceClockAction, runFollowupsAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const now = await demoNow(settings);
  const calls = await db().from("enrollments").select("student_id").eq("status", "a_appeler").is("call_done_at", null);
  const callCount = new Set((calls.data ?? []).map((r) => r.student_id)).size;
  const clock = new Intl.DateTimeFormat("fr-CA", { timeZone: "America/Toronto", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(now);

  const banner = {
    simule: { box: "bg-amber-50 text-amber-900 ring-amber-200", dot: "bg-amber-500", title: "Mode démo", text: "Aucun courriel ni SMS n'est réellement envoyé." },
    test: {
      box: "bg-sky-50 text-sky-900 ring-sky-200",
      dot: "bg-sky-500",
      title: "Mode test",
      text: `Courriels envoyés seulement à : ${settings.test_recipients || "(aucune adresse de test)"}. Aucun SMS.`,
    },
    reel: { box: "bg-rose-50 text-rose-900 ring-rose-200", dot: "bg-rose-500", title: "Envoi réel", text: "Les courriels sont envoyés aux parents. Aucun SMS." },
  }[settings.email_mode];

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-stone-200/70 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
        <Link href="/" className="flex items-center gap-3 px-5 py-4 md:block md:px-6 md:pt-7 md:pb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Éducation Futée" className="h-11 w-auto md:h-auto md:w-36" />
          <span className="block text-xs font-medium text-stone-400 md:mt-2">Intégration des élèves</span>
        </Link>
        <div className="px-3 pb-3 md:flex-1 md:overflow-y-auto md:pb-4">
          <Nav callCount={callCount} />
        </div>
        <form action={logoutAction} className="hidden border-t border-stone-100 p-3 md:block">
          <button className="btn btn-secondary w-full text-xs">Se déconnecter</button>
        </form>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="px-4 pt-4 md:px-8 md:pt-6">
          <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-4 py-2.5 text-sm ring-1 ${banner.box}`}>
            <span className="flex items-center gap-2 font-semibold">
              <span className={`h-2 w-2 rounded-full ${banner.dot}`} />
              {banner.title}
            </span>
            <span className="min-w-0">{banner.text}</span>
            <span className="opacity-75">
              Horloge : <strong className="font-semibold">{clock}</strong>
              {settings.demo_offset_hours > 0 && <span> (+{settings.demo_offset_hours} h)</span>}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
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
              <form action={logoutAction} className="md:hidden">
                <button className="btn btn-secondary py-1 text-xs">Se déconnecter</button>
              </form>
            </div>
          </div>
        </div>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
