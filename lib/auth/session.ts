import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "clarity_session";
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_SECRET environment variable.");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  sub: string;
  email: string;
  name: string | null;
  role: string;
};

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ONE_WEEK_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as SessionPayload;
}

export function parseCookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(/;\s*/g);
  for (const pair of pairs) {
    const [key, ...rest] = pair.split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function sessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ONE_WEEK_SECONDS}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
