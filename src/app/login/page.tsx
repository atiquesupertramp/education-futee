import { LoginForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connexion · Éducation Futée", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/" } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-brand-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Éducation Futée" className="mx-auto mb-6 w-32" />
        <h1 className="mb-4 text-center text-xl font-bold text-stone-900">Connexion</h1>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
