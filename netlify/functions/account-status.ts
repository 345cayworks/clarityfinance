import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { getUserApprovalStatus } from "./_approval";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  const identityUser = getIdentityUser(event);
  if (!identityUser) return json(401, { error: "Unauthorized" });

  await sql`UPDATE users SET last_login_at=NOW(), updated_at=NOW() WHERE email=${identityUser.email}`;
  const status = await getUserApprovalStatus(identityUser);
  return json(200, status);
};
