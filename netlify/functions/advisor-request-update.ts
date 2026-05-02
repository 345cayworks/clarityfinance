import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { writeAuditLog } from "./_audit";
import { requireAssignedAdvisorOrAdmin } from "./_access";
import { json, parseJsonBody } from "./_utils";

const allowed = new Set(["new", "reviewing", "contacted", "action_plan_sent", "closed"]);
const ENSURE_ADVISOR_COLUMNS_SQL = sql`
  ALTER TABLE advisor_requests
  ADD COLUMN IF NOT EXISTS advisor_notes text,
  ADD COLUMN IF NOT EXISTS advisor_private_notes text,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS advisor_last_updated_at timestamptz
`;

type AdvisorRequestRow = {
  id: string;
  assigned_advisor_email: string | null;
  assigned_advisor_id: string | null;
  user_id: string | null;
  email: string | null;
  status: string;
  advisor_notes: string | null;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    await ENSURE_ADVISOR_COLUMNS_SQL;
    const body = parseJsonBody<{ requestId?: string; status?: string; advisorNotes?: string }>(event) ?? {};
    if (!body.requestId || !body.status || !allowed.has(body.status)) return json(400, { error: "Invalid payload" });

    const targetRows = await sql`
      SELECT id, assigned_advisor_email, assigned_advisor_id, user_id, email, status, advisor_notes
      FROM advisor_requests
      WHERE id = ${body.requestId}
      LIMIT 1
    ` as AdvisorRequestRow[];
    const current = targetRows[0];
    if (!current) return json(404, { error: "Not found" });

    const access = await requireAssignedAdvisorOrAdmin(event, {
      assignedAdvisorEmail: current.assigned_advisor_email,
      assignedAdvisorId: current.assigned_advisor_id
    });
    if (!access.ok) return json(access.statusCode, access.body);

    const updatedRows = await sql`
      UPDATE advisor_requests
      SET
        status = ${body.status},
        advisor_notes = ${body.advisorNotes ?? null},
        advisor_last_updated_at = NOW(),
        status_updated_at = NOW(),
        last_contacted_at = CASE WHEN ${body.status} = 'contacted' THEN NOW() ELSE last_contacted_at END,
        closed_at = CASE WHEN ${body.status} = 'closed' THEN NOW() ELSE closed_at END,
        updated_at = NOW()
      WHERE id = ${body.requestId}
      RETURNING *
    ` as Array<Record<string, unknown>>;

    const updated = updatedRows[0];
    if (!updated) return json(404, { error: "Not found" });

    const notesChanged = (body.advisorNotes ?? null) !== (current.advisor_notes ?? null);
    const statusChanged = body.status !== current.status;

    if (statusChanged) {
      await writeAuditLog({ actorUserId: access.user.id, actorEmail: access.user.email, action: "advisor_request_status_updated", targetUserId: current.user_id, targetEmail: current.email, entityType: "advisor_request", entityId: current.id, metadata: { fromStatus: current.status, toStatus: body.status } });
      if (body.status === "closed") {
        await writeAuditLog({ actorUserId: access.user.id, actorEmail: access.user.email, action: "advisor_request_closed", targetUserId: current.user_id, targetEmail: current.email, entityType: "advisor_request", entityId: current.id, metadata: { fromStatus: current.status } });
      }
    }
    if (notesChanged) {
      await writeAuditLog({ actorUserId: access.user.id, actorEmail: access.user.email, action: "advisor_request_notes_updated", targetUserId: current.user_id, targetEmail: current.email, entityType: "advisor_request", entityId: current.id, metadata: { status: body.status } });
    }

    return json(200, { request: updated });
  } catch (err) {
    console.error("[advisor-request-update] Failed to update advisor request", {
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
      method: event.httpMethod
    });
    return json(500, { error: "Failed to update request" });
  }
};
