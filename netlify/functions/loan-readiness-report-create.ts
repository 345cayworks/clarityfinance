import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requirePremiumUser } from "./_access";
import { json, randomId } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const access = await requirePremiumUser(event);
  if (!access.ok) return json(access.statusCode, access.body);

  const rows = await sql`SELECT * FROM loan_readiness_applications WHERE user_id = ${access.user.id} ORDER BY updated_at DESC LIMIT 1` as Record<string, unknown>[];
  const latest = rows[0];
  if (!latest) return json(200, { success: true, report: { title: "Loan Readiness Snapshot", generatedAt: new Date().toISOString(), summary: "No saved loan readiness application found yet." } });

  const reportId = randomId("rpt");
  const snapshot = { generatedAt: new Date().toISOString(), type: "loan_readiness", application: latest };
  await sql`INSERT INTO reports (id, user_id, title, report_json) VALUES (${reportId}, ${access.user.id}, 'Loan Readiness Snapshot', ${JSON.stringify(snapshot)}::jsonb)`;
  return json(200, { success: true, id: reportId });
};
