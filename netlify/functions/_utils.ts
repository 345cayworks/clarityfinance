import type { HandlerEvent, HandlerResponse } from "@netlify/functions";
import { parseCookieValue, SESSION_COOKIE, verifySessionToken } from "../../lib/auth/session";

export function json(statusCode: number, body: unknown, headers?: Record<string, string>): HandlerResponse {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  };
}

export function parseJsonBody<T>(event: HandlerEvent): T | null {
  if (!event.body) return null;
  try {
    return JSON.parse(event.body) as T;
  } catch {
    return null;
  }
}

export async function requireSession(event: HandlerEvent) {
  const token = parseCookieValue(event.headers.cookie, SESSION_COOKIE);
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}
