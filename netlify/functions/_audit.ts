import { sql } from "../../lib/db/neon";

type AuditLogInput = {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetUserId?: string | null;
  targetEmail?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(entry: AuditLogInput) {
  await sql`
    INSERT INTO audit_logs (actor_user_id, actor_email, action, target_user_id, target_email, entity_type, entity_id, metadata)
    VALUES (
      ${entry.actorUserId ?? null},
      ${entry.actorEmail?.toLowerCase() ?? null},
      ${entry.action},
      ${entry.targetUserId ?? null},
      ${entry.targetEmail?.toLowerCase() ?? null},
      ${entry.entityType ?? null},
      ${entry.entityId ?? null},
      ${JSON.stringify(entry.metadata ?? {})}::jsonb
    )
  `;
}
