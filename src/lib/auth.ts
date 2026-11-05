import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/** Throws unless the request carries a valid staff session. Call first in every server action. */
export async function requireAuth(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token, process.env.AUTH_SECRET))) {
    throw new Error("Non autorisé");
  }
}
