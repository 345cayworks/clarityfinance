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

async function ensureAuditLogsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id bigserial PRIMARY KEY,
      actor_user_id text,
      actor_email text,
      action text NOT NULL,
      target_user_id text,
      target_email text,
      entity_type text,
      entity_id text,
      metadata jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now()
    )
  `;

  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_user_id text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_email text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_user_id text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_email text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_target_email ON audit_logs(target_email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`;
}

export async function writeAuditLog(entry: AuditLogInput) {
  await ensureAuditLogsTable();
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
