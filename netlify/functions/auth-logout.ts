import type { Handler } from "@netlify/functions";
import { clearSessionCookie } from "../../lib/auth/session";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  return json(200, { success: true, redirectTo: "/login" }, { "set-cookie": clearSessionCookie() });
};
