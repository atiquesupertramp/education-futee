"use client";

export default function ConfirmError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-stone-200/70">
        <h1 className="text-2xl font-bold text-stone-900">Un petit souci de notre côté</h1>
        <p className="mt-3 text-stone-700">Veuillez réessayer. Si le problème persiste, écrivez-nous à info@educationfutee.com.</p>
        <button onClick={reset} className="btn btn-primary mt-6 w-full py-3 text-base">Réessayer</button>
      </div>
    </main>
  );
}
