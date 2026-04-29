import type { Handler } from "@netlify/functions";
import { getIdentityUser } from "./_identity";
import { getUserApprovalStatus } from "./_approval";
import { json } from "./_utils";

export const handler: Handler = async (event) => {
  const identityUser = getIdentityUser(event);
  if (!identityUser) return json(401, { error: "Unauthorized" });

  const status = await getUserApprovalStatus(identityUser);
  return json(200, status);
};
