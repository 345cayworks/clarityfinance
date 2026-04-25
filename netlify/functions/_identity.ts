import type { HandlerEvent } from "@netlify/functions";
import { decodeJwt } from "jose";

export type IdentityUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(/;\s*/g);
  for (const pair of pairs) {
    const [key, ...rest] = pair.split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function extractToken(event: HandlerEvent): string | null {
  const authHeader = event.headers.authorization ?? event.headers.Authorization;
  if (authHeader && typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim() || null;
  }
  const cookie = event.headers.cookie ?? event.headers.Cookie;
  return readCookie(typeof cookie === "string" ? cookie : undefined, "nf_jwt");
}

export function getIdentityUser(event: HandlerEvent): IdentityUser | null {
  const token = extractToken(event);
  if (!token) return null;

  try {
    const payload = decodeJwt(token);
    const metadata = payload.user_metadata as Record<string, unknown> | undefined;
    const appMetadata = payload.app_metadata as Record<string, unknown> | undefined;

    const id = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    const name =
      typeof metadata?.full_name === "string"
        ? metadata.full_name
        : typeof metadata?.name === "string"
          ? metadata.name
          : email || null;

    const roles = appMetadata?.roles;
    const role = Array.isArray(roles) && typeof roles[0] === "string" ? roles[0] : "user";

    if (!id || !email) return null;

    return { id, email, name, role };
  } catch {
    return null;
  }
}
