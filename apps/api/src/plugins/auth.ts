import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../lib/logger';

export interface JWTPayload {
  userId: string;
  tenantId: string;
  role: string;
  type: 'tenant' | 'superadmin';
}

// Extend Fastify typings
declare module 'fastify' {
  interface FastifyRequest {
    user: JWTPayload;
  }
}

const PUBLIC_PREFIXES = [
  '/health',
  '/api/auth/',
  '/api/webhooks/',
  '/api/superadmin/login',
  '/api/inbox/stream', // SSE: JWT verificado en la propia ruta via query param ?token=
];

export function setupAuthGuard(server: FastifyInstance): void {
  server.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const url = request.url.split('?')[0];

    if (!url.startsWith('/api/')) return;

    const isPublic = PUBLIC_PREFIXES.some(
      (p) => url === p || url.startsWith(p)
    );
    if (isPublic) return;

    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized: token inválido o ausente' });
    }
  });
}

export function verifyTenantAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  tenantId: string
): boolean {
  const user = request.user as JWTPayload | undefined;
  if (!user) {
    reply.status(401).send({ error: 'Unauthorized' });
    return false;
  }
  if (user.type === 'superadmin') return true;
  if (user.tenantId !== tenantId) {
    logger.warn(
      `Tenant access denied: user ${user.userId} (tenant ${user.tenantId}) tried to access tenant ${tenantId}`
    );
    reply.status(403).send({ error: 'Acceso denegado: tenant no coincide' });
    return false;
  }
  return true;
}
