"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_MAX_AGE_S, createSessionToken, safeEqual } from "@/lib/session";

export type LoginState = { error?: string };

/** Only allow redirects to a path on this site. */
function safeNext(raw: string): string {
  return raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/";
}

export async function loginAction(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!password || !secret) return { error: "La connexion n'est pas configurée. Contactez l'administrateur." };

  const given = String(fd.get("password") ?? "");
  const ok = given.length > 0 && (await safeEqual(given, password, secret));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return { error: "Mot de passe incorrect." };
  }

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
  redirect(safeNext(String(fd.get("next") ?? "/")));
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
