import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { json, randomId } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const identityUser = getIdentityUser(event);
  if (!identityUser) return json(401, { error: "Unauthorized" });

  await sql`
    INSERT INTO action_plans (id, user_id, name, thirty_day_json, ninety_day_json, twelve_month_json)
    VALUES (
      ${randomId("apn")}, ${identityUser.id}, 'Guided Action Plan',
      ${JSON.stringify(["Audit expenses", "Automate savings"])}::jsonb,
      ${JSON.stringify(["Reduce one debt APR", "Boost income by 5%"])}::jsonb,
      ${JSON.stringify(["Reach emergency fund target", "Increase net cash flow by 20%"])}::jsonb
    )
  `;

  return json(200, { success: true });
};
