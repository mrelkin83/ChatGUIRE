import { db } from '@saas/db';
import { sql } from 'drizzle-orm';

/**
 * Wraps DB operations inside a transaction that activates RLS for the given tenant.
 * Use this for all sensitive write operations to enforce row-level security.
 */
export async function withTenantRLS<T>(
  tenantId: string,
  fn: (tx: typeof db) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql.raw(`SET LOCAL "app.current_tenant_id" = '${tenantId.replace(/'/g, "''")}'`)
    );
    return fn(tx as unknown as typeof db);
  });
}
