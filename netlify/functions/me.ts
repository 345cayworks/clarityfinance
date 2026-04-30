import type { Handler } from "@netlify/functions";
import { requireAuth } from "./_access";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  const auth = await requireAuth(event);
  if (!auth.ok) return json(401, { authenticated: false });

  return json(200, {
    authenticated: true,
    user: {
      id: auth.user.id,
      email: auth.user.email,
      name: auth.user.name,
      role: auth.user.role
    }
  });
};
