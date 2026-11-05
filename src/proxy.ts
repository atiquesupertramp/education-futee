import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Everything requires the staff login except:
 * - /login
 * - /confirmer/* (parents confirming from their email)
 * - /api/relances (Vercel cron, protected by its own CRON_SECRET)
 * - static assets, including the logos used in emails
 * Server actions also re-check the session (see requireAuth in src/lib/auth.ts).
 */
export async function proxy(request: NextRequest) {
  const ok = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET);
  if (ok) return NextResponse.next();

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  const url = request.nextUrl.clone();
  const next = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = "/login";
  url.search = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|confirmer|api/relances|_next/static|_next/image|icon\\.png|logo\\.png|logo-email\\.png|favicon\\.ico).*)"],
};
