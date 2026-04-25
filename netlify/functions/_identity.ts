import type { HandlerEvent } from "@netlify/functions";
import { decodeJwt } from "jose";

export type IdentityUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

export function getIdentityUser(event: HandlerEvent): IdentityUser | null {
  const header = event.headers.authorization ?? event.headers.Authorization;
  if (!header || !header.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length);

  try {
    // TODO: Verify JWT signature against Netlify JWKS in production.
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
