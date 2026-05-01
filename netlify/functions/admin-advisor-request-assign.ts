import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { json, parseJsonBody } from "./_utils";

export const handler: Handler = async (event) => {
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  const body = parseJsonBody<{ requestId?: string; advisorId?: string; advisorEmail?: string }>(event) ?? {};
  if (!body.requestId || !body.advisorId || !body.advisorEmail) return json(400, { error: "requestId, advisorId, advisorEmail required" });

  const advisor = await sql`SELECT id,name,email,role FROM users WHERE id=${body.advisorId} AND email=${body.advisorEmail} LIMIT 1` as Array<{id:string;email:string;role:string;name:string}>;
  if (!advisor[0] || !["advisor", "admin", "superadmin"].includes(advisor[0].role)) return json(400, { error: "Advisor not eligible" });

  const updated = await sql`
    UPDATE advisor_requests
    SET assigned_advisor_id=${advisor[0].id},assigned_advisor_email=${advisor[0].email},assigned_at=NOW(),assigned_by=${admin.user.email},status='reviewing',updated_at=NOW()
    WHERE id=${body.requestId}
    RETURNING id,name,email,topic,urgency,message,status,assigned_advisor_id,assigned_advisor_email,assigned_at,assigned_by,prequalification_share_url
  ` as Array<Record<string, string>>;
  if (!updated[0]) return json(404, { error: "Request not found" });

  // TODO: PDF attachment phase: generate prequalification PDF and attach in outbound email via Resend.
  // Placeholder notification hook: email infrastructure can consume this payload.
  console.log("advisor_assignment_notification", {
    to: advisor[0].email,
    subject: "New advisor request assigned to you",
    body: {
      clientName: updated[0].name,
      topic: updated[0].topic,
      urgency: updated[0].urgency,
      messagePreview: (updated[0].message ?? "").slice(0, 180),
      dashboardLink: `/app/advisor/dashboard?requestId=${updated[0].id}`,
      prequalificationLink: updated[0].prequalification_share_url || null,
      note: "Open the assigned request to view profile/prequalification information."
    }
  });

  return json(200, { ok: true, request: { ...updated[0], advisor_name: advisor[0].name ?? null } });
};
