import type { Handler } from "@netlify/functions";
import { requireSession, json } from "./_utils";

export const handler: Handler = async (event) => {
  const session = await requireSession(event);
  if (!session) return json(401, { authenticated: false });

  return json(200, {
    authenticated: true,
    user: {
      id: session.sub,
      email: session.email,
      name: session.name,
      role: session.role
    }
  });
};
