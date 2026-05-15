import { db, tenantConfig } from '@saas/db';
import { eq, and } from 'drizzle-orm';
import { redis } from './redis';

const CONFIG_CACHE_TTL = 300; // 5 minutes

export async function getConfig<T>(tenantId: string, key: string, defaultValue: T): Promise<T> {
  const cacheKey = `config:${tenantId}:${key}`;
  
  // 1. Check Redis cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as T;
    } catch {
      // ignore parse error and fallback to DB
    }
  }

  // 2. Query DB
  const [config] = await db
    .select()
    .from(tenantConfig)
    .where(
      and(
        eq(tenantConfig.tenantId, tenantId),
        eq(tenantConfig.key, key)
      )
    )
    .limit(1);

  const value = config ? (config.value as T) : defaultValue;

  // 3. Cache result
  await redis.setex(cacheKey, CONFIG_CACHE_TTL, JSON.stringify(value));

  return value;
}

export async function setConfig<T>(tenantId: string, key: string, value: T): Promise<void> {
  const cacheKey = `config:${tenantId}:${key}`;

  await db
    .insert(tenantConfig)
    .values({
      tenantId,
      key,
      value: value as any,
    })
    .onConflictDoUpdate({
      target: [tenantConfig.tenantId, tenantConfig.key],
      set: { value: value as any, updatedAt: new Date() },
    });

  await redis.setex(cacheKey, CONFIG_CACHE_TTL, JSON.stringify(value));
}
