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
    simule: { box: "border-amber-200 bg-amber-50 text-amber-900", title: "Mode démo", text: "Aucun courriel ni SMS n'est réellement envoyé." },
    test: {
      box: "border-sky-200 bg-sky-50 text-sky-900",
      title: "Mode test",
      text: `Les courriels sont envoyés seulement à : ${settings.test_recipients || "(aucune adresse de test)"}. Aucun SMS n'est envoyé.`,
    },
    reel: { box: "border-rose-200 bg-rose-50 text-rose-900", title: "Envoi réel", text: "Les courriels sont envoyés aux parents. Aucun SMS n'est envoyé." },
  }[settings.email_mode];

  return (
    <>
        <div className={`border-b ${banner.box}`}>
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm">
            <span className="font-semibold">{banner.title}</span>
            <span>{banner.text}</span>
            <span className="opacity-80">
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
              <form action={logoutAction}>
                <button className="btn btn-secondary py-1 text-xs">Se déconnecter</button>
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
