import crypto from "crypto";
import type { HandlerEvent, HandlerResponse } from "@netlify/functions";

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

export function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}
