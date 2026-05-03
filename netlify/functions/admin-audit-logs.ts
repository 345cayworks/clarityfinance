import type { Handler } from "@netlify/functions";
import { sql } from "../../lib/db/neon";
import { requireAdmin } from "./_access";
import { json } from "./_utils";
import { writeAuditLog } from "./_audit";

type AuditLogRow = {
  id: number;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  target_user_id: string | null;
  target_email: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  const admin = await requireAdmin(event);
  if (!admin.ok) return json(admin.statusCode, admin.body);

  try {
    await writeAuditLog({
      actorUserId: admin.user.id,
      actorEmail: admin.user.email,
      action: "audit_logs_viewed",
      entityType: "admin_audit",
      metadata: { source: "admin-audit-logs" }
    });

    const rows = (await sql`
      SELECT id, actor_user_id, actor_email, action, target_user_id, target_email, entity_type, entity_id, metadata, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 100
    `) as AuditLogRow[];

    return json(200, { logs: rows });
  } catch (error) {
    console.error("admin-audit-logs failed", { name: error instanceof Error ? error.name : "UnknownError" });
    return json(500, { error: "Failed to load audit logs." });
  }
};
