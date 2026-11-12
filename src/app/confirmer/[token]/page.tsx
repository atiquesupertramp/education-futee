import { lookupToken } from "@/lib/onboarding";
import { ConfirmForm, Thanks } from "./confirm-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Confirmation · Éducation Futée", robots: { index: false } };

export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let r = null;
  let failed = false;
  try {
    r = await lookupToken(token);
  } catch (e) {
    console.error("Confirmation lookup failed", e);
    failed = true;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-brand-900/5 ring-1 ring-stone-200/70">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Éducation Futée" className="mx-auto mb-6 w-32" />
        {failed ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Un petit souci de notre côté</h1>
            <p className="mt-3 text-stone-700">Veuillez réessayer dans un instant en rouvrant le lien du courriel. Si le problème persiste, écrivez-nous à info@educationfutee.com.</p>
          </>
        ) : !r ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Lien invalide</h1>
            <p className="mt-3 text-stone-700">Ce lien de confirmation n&apos;est plus valide. Écrivez-nous à info@educationfutee.com et nous ferons le suivi.</p>
          </>
        ) : r.confirmed ? (
          <Thanks student={r.student} cours={r.cours} codes={r.codes} />
        ) : (
          <ConfirmForm token={token} student={r.student} cours={r.cours} codes={r.codes} />
        )}
      </div>
    </main>
  );
}
