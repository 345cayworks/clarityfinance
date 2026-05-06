import { sql } from "../../lib/db/neon";

type AuditLogInput = {
  actor?: { id?: string | null; email?: string | null; role?: string | null } | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  targetUserId?: string | null;
  targetEmail?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  sourceFunction?: string | null;
  metadata?: Record<string, unknown>;
};

async function ensureAuditLogsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id bigserial PRIMARY KEY,
      actor_user_id text,
      actor_email text,
      actor_role text,
      action text NOT NULL,
      target_user_id text,
      target_email text,
      target_type text,
      target_id text,
      entity_type text,
      entity_id text,
      source_function text,
      metadata jsonb DEFAULT '{}'::jsonb,
      metadata_json jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now()
    )
  `;

  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_user_id text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_email text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_role text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_user_id text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_email text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_type text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_id text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS source_function text`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata_json jsonb DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_target_email ON audit_logs(target_email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`;
}

export async function writeAuditLog(entry: AuditLogInput) {
  await ensureAuditLogsTable();
  const actorUserId = entry.actorUserId ?? entry.actor?.id ?? null;
  const actorEmail = entry.actorEmail ?? entry.actor?.email ?? null;
  const actorRole = entry.actorRole ?? entry.actor?.role ?? null;
  const targetType = entry.targetType ?? entry.entityType ?? null;
  const targetId = entry.targetId ?? entry.entityId ?? null;
  const metadata = entry.metadata ?? {};
  await sql`
    INSERT INTO audit_logs (actor_user_id, actor_email, actor_role, action, target_user_id, target_email, target_type, target_id, entity_type, entity_id, source_function, metadata, metadata_json)
    VALUES (
      ${actorUserId},
      ${actorEmail?.toLowerCase() ?? null},
      ${actorRole},
      ${entry.action},
      ${entry.targetUserId ?? null},
      ${entry.targetEmail?.toLowerCase() ?? null},
      ${targetType},
      ${targetId},
      ${entry.entityType ?? null},
      ${entry.entityId ?? null},
      ${entry.sourceFunction ?? null},
      ${JSON.stringify(metadata)}::jsonb,
      ${JSON.stringify(metadata)}::jsonb
    )
  `;
}

export async function recordAuditLog(entry: AuditLogInput) {
  return writeAuditLog(entry);
}
