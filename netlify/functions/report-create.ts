import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { json, randomId } from "./_utils";

type ProfileRow = Record<string, unknown>;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const identityUser = getIdentityUser(event);
  if (!identityUser) return json(401, { error: "Unauthorized" });

  const profile = await sql`SELECT * FROM profiles WHERE user_id = ${identityUser.id} LIMIT 1` as ProfileRow[];
  await sql`
    INSERT INTO reports (id, user_id, title, report_json)
    VALUES (${randomId("rpt")}, ${identityUser.id}, 'Clarity Finance Snapshot', ${JSON.stringify({ profile: profile[0] ?? null, generatedAt: new Date().toISOString() })}::jsonb)
  `;

  return json(200, { success: true });
};
