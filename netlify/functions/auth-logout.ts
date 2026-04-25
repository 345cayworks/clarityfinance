import type { Handler } from "@netlify/functions";
import { clearSessionCookie } from "../../lib/auth/session";
import { json } from "./_utils";

export const handler: Handler = async () => {
  return json(200, { success: true, redirectTo: "/login" }, { "set-cookie": clearSessionCookie() });
};
