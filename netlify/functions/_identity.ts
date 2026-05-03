import type { HandlerEvent } from "@netlify/functions";
import { jwtVerify } from "jose";

export type IdentityUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

type VerifiedJwtPayload = {
  sub?: unknown;
  id?: unknown;
  email?: unknown;
  user_metadata?: unknown;
  app_metadata?: unknown;
};

type EventWithClientContext = HandlerEvent & {
  clientContext?: {
    user?: VerifiedJwtPayload | null;
  } | null;
};

type JwtSecretAvailability = {
  netlifyIdentityJwtSecretExists: boolean;
  netlifyJwtSecretExists: boolean;
  jwtSecretExists: boolean;
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

function hasAuthorizationHeader(event: HandlerEvent): boolean {
  const authHeader = event.headers.authorization ?? event.headers.Authorization;
  return typeof authHeader === "string" && authHeader.length > 0;
}

function hasNfJwtCookie(event: HandlerEvent): boolean {
  const cookie = event.headers.cookie ?? event.headers.Cookie;
  return readCookie(typeof cookie === "string" ? cookie : undefined, "nf_jwt") !== null;
}

function extractToken(event: HandlerEvent): string | null {
  const authHeader = event.headers.authorization ?? event.headers.Authorization;
  if (authHeader && typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim() || null;
  }
  const cookie = event.headers.cookie ?? event.headers.Cookie;
  return readCookie(typeof cookie === "string" ? cookie : undefined, "nf_jwt");
}

function getJwtSecret() {
  return process.env.NETLIFY_IDENTITY_JWT_SECRET ?? process.env.NETLIFY_JWT_SECRET ?? process.env.JWT_SECRET ?? null;
}

function getJwtSecretAvailability(): JwtSecretAvailability {
  return {
    netlifyIdentityJwtSecretExists: Boolean(process.env.NETLIFY_IDENTITY_JWT_SECRET),
    netlifyJwtSecretExists: Boolean(process.env.NETLIFY_JWT_SECRET),
    jwtSecretExists: Boolean(process.env.JWT_SECRET)
  };
}

function getClientContextUser(event: HandlerEvent): VerifiedJwtPayload | null {
  const contextUser = (event as EventWithClientContext).clientContext?.user;
  return contextUser && typeof contextUser === "object" ? contextUser : null;
}

function isValidBaseUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getIdentityBaseUrl(event: HandlerEvent): string {
  const forwardedProto = event.headers["x-forwarded-proto"] ?? event.headers["X-Forwarded-Proto"];
  const host = event.headers.host ?? event.headers.Host;
  if (typeof host === "string" && host.trim()) {
    const proto = typeof forwardedProto === "string" && forwardedProto.trim() ? forwardedProto.split(",")[0] : "https";
    return `${proto}://${host}`;
  }
  if (isValidBaseUrl(process.env.APP_URL)) return process.env.APP_URL;
  if (isValidBaseUrl(process.env.URL)) return process.env.URL;
  if (isValidBaseUrl(process.env.DEPLOY_URL)) return process.env.DEPLOY_URL;
  return "https://clarityfinance.cayworks.com";
}

function logIdentityDiagnostics(
  event: HandlerEvent,
  options: { jwtVerifyErrorName?: string | null; identityEndpointStatus?: number | null } = {}
): void {
  const clientContext = (event as EventWithClientContext).clientContext;
  console.info(
    "[identity-diagnostics]",
    JSON.stringify({
      clientContextExists: Boolean(clientContext),
      clientContextUserExists: Boolean(clientContext?.user),
      authorizationHeaderExists: hasAuthorizationHeader(event),
      nfJwtCookieExists: hasNfJwtCookie(event),
      identityEndpointStatus: options.identityEndpointStatus ?? null,
      ...getJwtSecretAvailability(),
      jwtVerifyErrorName: options.jwtVerifyErrorName ?? null
    })
  );
}

function toIdentityUser(payload: VerifiedJwtPayload): IdentityUser | null {
  const metadata = payload.user_metadata as Record<string, unknown> | undefined;
  const appMetadata = payload.app_metadata as Record<string, unknown> | undefined;

  const id =
    typeof payload.sub === "string"
      ? payload.sub
      : typeof payload.id === "string"
        ? payload.id
        : typeof metadata?.sub === "string"
          ? metadata.sub
          : "";
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
}

async function fetchIdentityUser(event: HandlerEvent, token: string): Promise<{ user: IdentityUser | null; status: number | null }> {
  try {
    const response = await fetch(`${getIdentityBaseUrl(event)}/.netlify/identity/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return { user: null, status: response.status };
    const payload = (await response.json()) as VerifiedJwtPayload;
    return { user: toIdentityUser(payload), status: response.status };
  } catch (error) {
    console.info(
      "[identity-endpoint-error]",
      JSON.stringify({ errorName: error instanceof Error ? error.name : "UnknownError" })
    );
    return { user: null, status: null };
  }
}

export async function getIdentityUser(event: HandlerEvent): Promise<IdentityUser | null> {
  const contextUser = getClientContextUser(event);
  const contextIdentityUser = contextUser ? toIdentityUser(contextUser) : null;
  if (contextIdentityUser) {
    logIdentityDiagnostics(event);
    return contextIdentityUser;
  }

  const token = extractToken(event);
  if (token) {
    const identityResult = await fetchIdentityUser(event, token);
    if (identityResult.user) {
      logIdentityDiagnostics(event, { identityEndpointStatus: identityResult.status });
      return identityResult.user;
    }
    logIdentityDiagnostics(event, { identityEndpointStatus: identityResult.status });
  }

  const secret = getJwtSecret();
  if (!secret || !token) {
    logIdentityDiagnostics(event);
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    logIdentityDiagnostics(event);
    return toIdentityUser(payload as VerifiedJwtPayload);
  } catch (error) {
    logIdentityDiagnostics(event, { jwtVerifyErrorName: error instanceof Error ? error.name : "UnknownError" });
    return null;
  }
}
