import { db } from '../../db/index.ts';
import { auditLogs } from '../../db/schema.ts';

export type DbAuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'CRON_RUN';

export async function recordDbAudit(params: {
  userId?: number | null;
  action: DbAuditAction;
  tableName: string;
  recordId: string | number;
  description: string;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId ?? null,
      action: params.action,
      tableName: params.tableName,
      recordId: String(params.recordId),
      description: params.description,
    });
  } catch (error) {
    console.error('Failed to write audit log entry:', error);
  }
}
