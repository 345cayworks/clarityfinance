import type { Handler } from "@netlify/functions";
import { randomId } from "../../lib/auth/session";
import { sql } from "../../lib/db/neon";
import { json, requireSession } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const session = await requireSession(event);
  if (!session) return json(401, { error: "Unauthorized" });

  const profile = await sql`SELECT * FROM profiles WHERE user_id = ${session.sub} LIMIT 1`;
  await sql`
    INSERT INTO reports (id, user_id, title, report_json)
    VALUES (${randomId("rpt")}, ${session.sub}, 'Clarity Finance Snapshot', ${JSON.stringify({ profile: profile[0] ?? null, generatedAt: new Date().toISOString() })}::jsonb)
  `;

  return json(200, { success: true });
};
