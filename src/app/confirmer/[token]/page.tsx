import { redirect } from "next/navigation";
import { confirmByToken, lookupToken } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export const metadata = { title: "Confirmation · Éducation Futée", robots: { index: false } };

async function confirmAction(fd: FormData) {
  "use server";
  const token = String(fd.get("token") ?? "");
  await confirmByToken(token, "bouton");
  redirect(`/confirmer/${token}?ok=1`);
}

export default async function ConfirmPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { token } = await params;
  const { ok } = await searchParams;
  const r = await lookupToken(token);
  const confirmed = r?.status === "confirme";

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-brand-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Éducation Futée" className="mx-auto mb-6 w-32" />
        {!r ? (
          <>
            <h1 className="text-2xl font-bold text-stone-900">Lien invalide</h1>
            <p className="mt-3 text-stone-700">Ce lien de confirmation n&apos;est plus valide. Écrivez-nous à info@educationfutee.com et nous ferons le suivi.</p>
          </>
        ) : confirmed ? (
          <>
            <h1 className="text-2xl font-bold text-stone-900">{ok ? "Merci, c'est confirmé! 💛" : "C'est déjà confirmé!"}</h1>
            <p className="mt-3 text-stone-700">
              Nous avons bien noté que vous avez reçu les informations <strong>du {r.cours.replace(/^le /, "")}</strong> de {r.student} (groupe {r.code}).
            </p>
            <p className="mt-4 text-sm text-stone-500">Prochaine étape : surveillez vos courriels pour l&apos;invitation à la plateforme éducative. Vous pouvez fermer cette page.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-stone-900">Confirmez la réception</h1>
            <p className="mt-3 text-stone-700">
              <strong>{r.subject}</strong> pour {r.student} (groupe {r.code}).
            </p>
            <p className="mt-2 text-sm text-stone-500">En confirmant, vous nous indiquez avoir bien reçu et lu le courriel de bienvenue.</p>
            <form action={confirmAction} className="mt-6">
              <input type="hidden" name="token" value={token} />
              <button className="btn btn-primary w-full py-3 text-base">Je confirme la réception</button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
