import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { getIdentityUser } from "./_identity";
import { json } from "./_utils";

type UserRow = {
  role: string | null;
};

export const handler: Handler = async (event) => {
  const identityUser = getIdentityUser(event);
  if (!identityUser) return json(401, { authenticated: false });

  await sql`
    INSERT INTO users (id, email, name)
    VALUES (${identityUser.id}, ${identityUser.email}, ${identityUser.name})
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, users.name),
      updated_at = NOW()
  `;

  const userRows = await sql`
    SELECT role FROM users WHERE id = ${identityUser.id} LIMIT 1
  ` as UserRow[];

  return json(200, {
    authenticated: true,
    user: {
      id: identityUser.id,
      email: identityUser.email,
      name: identityUser.name,
      role: userRows[0]?.role ?? "user"
    }
  });
};
