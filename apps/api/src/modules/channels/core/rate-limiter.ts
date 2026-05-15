import { redis } from '../../../lib/redis';
import { ChannelType } from '@saas/shared';
import { getConfig } from '../../../lib/tenant-config';
import { logger } from '../../../lib/logger';

export async function isRateLimited(tenantId: string, channel: ChannelType): Promise<boolean> {
  const maxPerMinute = await getConfig(tenantId, `rate_limit_${channel}`, 30);
  const key = `ratelimit:${tenantId}:${channel}:${new Date().getMinutes()}`;

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, 60);
  }

  if (current > maxPerMinute) {
    logger.warn(`Rate limit exceeded for tenant ${tenantId} on channel ${channel}: ${current}/${maxPerMinute}`);
    return true;
  }

  return false;
}
