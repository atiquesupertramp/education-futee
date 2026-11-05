/**
 * Signed session cookie for the staff login. Uses Web Crypto only, so it runs
 * both in proxy.ts and in server code. Fails closed: with no AUTH_SECRET every
 * token is rejected.
 */
export const SESSION_COOKIE = "ef_session";
export const SESSION_MAX_AGE_S = 7 * 24 * 3600;

const enc = new TextEncoder();

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison (both inputs are hashed to equal length first). */
export async function safeEqual(a: string, b: string, secret: string): Promise<boolean> {
  const [x, y] = await Promise.all([hmac(a, secret), hmac(b, secret)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(secret: string, now = Date.now()): Promise<string> {
  const exp = Math.floor(now / 1000) + SESSION_MAX_AGE_S;
  return `${exp}.${await hmac(`session:${exp}`, secret)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < Math.floor(now / 1000)) return false;
  return safeEqual(sig, await hmac(`session:${exp}`, secret), secret);
}
