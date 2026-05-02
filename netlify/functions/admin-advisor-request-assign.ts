import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { writeAuditLog } from "./_audit";
import { json, parseJsonBody } from "./_utils";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  const body = parseJsonBody<{ requestId?: string; advisorId?: string; advisorEmail?: string }>(event) ?? {};
  const requestId = (body.requestId ?? "").trim();
  const advisorId = (body.advisorId ?? "").trim();
  const advisorEmail = (body.advisorEmail ?? "").trim().toLowerCase();
  if (!requestId || !advisorId || !advisorEmail) return json(400, { error: "requestId, advisorId, advisorEmail required" });

  const advisor = await sql`
    SELECT id,name,email,role,account_status,approval_status
    FROM users
    WHERE id=${advisorId} AND email=${advisorEmail}
    LIMIT 1
  ` as Array<{id:string;email:string;role:string;name:string;account_status:string;approval_status:string}>;
  if (!advisor[0]) return json(404, { error: "Advisor not found" });
  if (!["advisor", "admin", "superadmin"].includes(advisor[0].role) || advisor[0].account_status !== "active" || advisor[0].approval_status !== "approved") {
    return json(400, { error: "Advisor not eligible" });
  }

  const existing = await sql`SELECT assigned_advisor_id FROM advisor_requests WHERE id=${requestId} LIMIT 1` as Array<{assigned_advisor_id:string|null}>;
  const wasAssigned = Boolean(existing[0]?.assigned_advisor_id);

  const updated = await sql`
    UPDATE advisor_requests
    SET assigned_advisor_id=${advisor[0].id},assigned_advisor_email=${advisor[0].email},assigned_at=NOW(),assigned_by=${admin.user.email},status='reviewing',updated_at=NOW()
    WHERE id=${requestId}
    RETURNING id,name,email,topic,urgency,message,status,assigned_advisor_id,assigned_advisor_email,assigned_at,assigned_by,prequalification_share_url
  ` as Array<Record<string, string>>;
  if (!updated[0]) return json(404, { error: "Request not found" });

  await writeAuditLog({
    actorUserId: admin.user.id,
    actorEmail: admin.user.email,
    action: wasAssigned ? "advisor_reassigned" : "advisor_assigned",
    targetUserId: advisor[0].id,
    targetEmail: advisor[0].email,
    entityType: "advisor_request",
    entityId: requestId,
    metadata: { advisorId: advisor[0].id, advisorEmail: advisor[0].email }
  });

  return json(200, { ok: true, request: { ...updated[0], advisor_name: advisor[0].name ?? null } });
};
