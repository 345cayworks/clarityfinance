import type { HandlerEvent } from "@netlify/functions";
import { decodeJwt } from "jose";

export type IdentityUser = {
  id: string;
  email: string | null;
  name: string | null;
  userMetadata: Record<string, unknown> | null;
};

function getBearerToken(authorizationHeader?: string | null) {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export function getIdentityUser(event: HandlerEvent): IdentityUser | null {
  const token = getBearerToken(event.headers.authorization ?? event.headers.Authorization ?? null);
  if (!token) return null;

  try {
    const payload = decodeJwt(token);
    const id = typeof payload.sub === "string" ? payload.sub : null;

    if (!id) return null;

    const appMetadata = typeof payload.app_metadata === "object" && payload.app_metadata ? payload.app_metadata : null;
    const userMetadata = typeof payload.user_metadata === "object" && payload.user_metadata ? payload.user_metadata : null;

    const metadataName = userMetadata && typeof userMetadata.full_name === "string"
      ? userMetadata.full_name
      : userMetadata && typeof userMetadata.name === "string"
        ? userMetadata.name
        : null;

    const appMetadataName = appMetadata && typeof appMetadata.name === "string" ? appMetadata.name : null;

    return {
      id,
      email: typeof payload.email === "string" ? payload.email : null,
      name: metadataName ?? appMetadataName,
      userMetadata
    };
  } catch {
    return null;
  }
}
