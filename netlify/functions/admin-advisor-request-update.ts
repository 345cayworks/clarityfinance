import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { writeAuditLog } from "./_audit";
import { json, parseJsonBody } from "./_utils";
import { notifyUser } from "../../lib/notifications/notify";

const allowed = new Set(["reviewing", "contacted", "closed"]);

async function ensureAdvisorRequestAdminColumns() {
  await sql`ALTER TABLE advisor_requests ADD COLUMN IF NOT EXISTS advisor_notes text`;
  await sql`ALTER TABLE advisor_requests ADD COLUMN IF NOT EXISTS admin_notes text`;
  await sql`ALTER TABLE advisor_requests ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  const body = parseJsonBody<{ id?: string; status?: string; advisorNotes?: string; adminNotes?: string }>(event) ?? {};
  const id = (body.id ?? "").trim();
  const status = (body.status ?? "").trim();
  const hasStatus = Boolean(status);
  const hasAdvisorNotes = typeof body.advisorNotes === "string";
  const hasAdminNotes = typeof body.adminNotes === "string";

  if (!id) return json(400, { error: "id is required" });
  if (hasStatus && !allowed.has(status)) return json(400, { error: "Valid status required" });
  if (!hasStatus && !hasAdvisorNotes && !hasAdminNotes) return json(400, { error: "At least one update field is required" });

  await ensureAdvisorRequestAdminColumns();

  const existing = await sql`
    SELECT id,user_id,email,status,advisor_notes,admin_notes
    FROM advisor_requests
    WHERE id=${id}
    LIMIT 1
  ` as Array<{ id: string; user_id: string | null; email: string; status: string | null; advisor_notes: string | null; admin_notes: string | null }>;
  const request = existing[0];
  if (!request) return json(404, { error: "Request not found" });

  const nextStatus = hasStatus ? status : request.status;
  const nextAdvisorNotes = hasAdvisorNotes ? body.advisorNotes ?? "" : request.advisor_notes;
  const nextAdminNotes = hasAdminNotes ? body.adminNotes ?? "" : request.admin_notes;

  const updated = await sql`
    UPDATE advisor_requests
    SET status=${nextStatus}, advisor_notes=${nextAdvisorNotes}, admin_notes=${nextAdminNotes}, updated_at=NOW()
    WHERE id=${id}
    RETURNING id,status,advisor_notes,admin_notes,updated_at
  ` as Array<{ id: string; status: string; advisor_notes: string | null; admin_notes: string | null; updated_at: string }>;

  if (hasStatus && request.user_id) await notifyUser(request.user_id, "payment_followup", { requestId: id, status });

  await writeAuditLog({
    actorUserId: admin.user.id,
    actorEmail: admin.user.email,
    action: hasStatus ? "advisor_request_status_updated" : "advisor_request_notes_updated",
    targetEmail: request.email,
    entityType: "advisor_request",
    entityId: id,
    metadata: {
      previousStatus: request.status,
      newStatus: updated[0]?.status,
      advisorNotesUpdated: hasAdvisorNotes,
      adminNotesUpdated: hasAdminNotes
    }
  });

  return json(200, { success: true, request: updated[0] });
};
