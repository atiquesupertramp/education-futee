import { processDue } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

/** Called once a day by the Vercel scheduler (see vercel.json). */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Non autorisé", { status: 401 });
  }
  const result = await processDue();
  return Response.json({ ok: true, ...result });
}
