import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { db, tenants, users, tenantConfig, kanbanColumns } from '@saas/db';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../lib/logger';
import { redis } from '../../lib/redis';

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_SECONDS = 15 * 60; // 15 minutes

async function checkLoginRateLimit(ip: string, email: string): Promise<boolean> {
  const key = `login:fail:${ip}:${email}`;
  try {
    const attempts = await redis.get(key);
    return Number(attempts || 0) >= LOGIN_MAX_ATTEMPTS;
  } catch {
    return false; // fail-open
  }
}

async function recordLoginFailure(ip: string, email: string): Promise<void> {
  const key = `login:fail:${ip}:${email}`;
  try {
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, LOGIN_LOCKOUT_SECONDS);
  } catch {
    // fail-open
  }
}

async function clearLoginFailures(ip: string, email: string): Promise<void> {
  try {
    await redis.del(`login:fail:${ip}:${email}`);
  } catch {
    // ignore
  }
}

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

function signTokens(server: FastifyInstance, payload: object) {
  const accessToken = server.jwt.sign(payload, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = server.jwt.sign(
    { ...payload, tokenType: 'refresh' },
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  return { accessToken, refreshToken };
}

export async function authRoutes(server: FastifyInstance) {

  // ─── REGISTER ────────────────────────────────────────────────────────────
  server.post('/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantName, email, password, timezone } = request.body as {
      tenantName: string;
      email: string;
      password: string;
      timezone?: string;
    };

    if (!tenantName || !email || !password) {
      return reply.status(400).send({ error: 'tenantName, email y password son requeridos' });
    }
    if (password.length < 8) {
      return reply.status(400).send({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    try {
      // Check email not already in use across all tenants
      const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing) {
        return reply.status(409).send({ error: 'El email ya está registrado' });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Create tenant
      const [tenant] = await db.insert(tenants).values({
        name: tenantName,
        vertical: 'retail_fashion',
        timezone: timezone || 'America/Bogota',
      }).returning();

      // Create owner user
      const [user] = await db.insert(users).values({
        tenantId: tenant.id,
        email,
        passwordHash,
        fullName: tenantName,
        role: 'owner',
        isActive: true,
      }).returning();

      // Seed default tenant config
      await db.insert(tenantConfig).values([
        { tenantId: tenant.id, key: 'business_type', value: { key: 'restaurante', label: 'Restaurante', capabilities: ['catalog', 'payments'] } },
        { tenantId: tenant.id, key: 'schedule', value: buildDefaultSchedule() },
        { tenantId: tenant.id, key: 'notifications', value: { paymentReceived: true, escalation: true, newAppointment: true, dailySummary: false } },
        { tenantId: tenant.id, key: 'appearance', value: { theme: 'dark' } },
      ]);

      // Seed default kanban columns
      await db.insert(kanbanColumns).values([
        { tenantId: tenant.id, name: 'Nuevo',        color: '#6366F1', sortOrder: 0, isFinal: false },
        { tenantId: tenant.id, name: 'En contacto',  color: '#F59E0B', sortOrder: 1, isFinal: false },
        { tenantId: tenant.id, name: 'En progreso',  color: '#3B82F6', sortOrder: 2, isFinal: false },
        { tenantId: tenant.id, name: 'Esperando',    color: '#8B5CF6', sortOrder: 3, isFinal: false },
        { tenantId: tenant.id, name: 'Cerrado',      color: '#10B981', sortOrder: 4, isFinal: true  },
        { tenantId: tenant.id, name: 'Perdido',      color: '#EF4444', sortOrder: 5, isFinal: true  },
      ]);

      const payload = { userId: user.id, tenantId: tenant.id, role: user.role, type: 'tenant' as const };
      const { accessToken, refreshToken } = signTokens(server, payload);

      logger.info(`New tenant registered: ${tenant.id} (${email})`);

      return reply.status(201).send({
        accessToken,
        refreshToken,
        tenantId: tenant.id,
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      });
    } catch (err: any) {
      logger.error(`Register error: ${err.message}`);
      return reply.status(500).send({ error: 'Error interno al registrar' });
    }
  });

  // ─── LOGIN ────────────────────────────────────────────────────────────────
  server.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email: string; password: string };

    if (!email || !password) {
      return reply.status(400).send({ error: 'email y password son requeridos' });
    }

    const ip = request.ip || 'unknown';

    // Brute-force protection
    if (await checkLoginRateLimit(ip, email)) {
      return reply.status(429).send({ error: 'Demasiados intentos fallidos. Espera 15 minutos.' });
    }

    try {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (!user || !user.isActive) {
        await recordLoginFailure(ip, email);
        return reply.status(401).send({ error: 'Credenciales inválidas' });
      }

      if (!user.passwordHash) {
        return reply.status(401).send({ error: 'Cuenta sin contraseña configurada. Contacta al administrador.' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        await recordLoginFailure(ip, email);
        return reply.status(401).send({ error: 'Credenciales inválidas' });
      }

      await clearLoginFailures(ip, email);

      const payload = { userId: user.id, tenantId: user.tenantId, role: user.role, type: 'tenant' as const };
      const { accessToken, refreshToken } = signTokens(server, payload);

      logger.info(`User logged in: ${user.id} (tenant ${user.tenantId})`);

      return {
        accessToken,
        refreshToken,
        tenantId: user.tenantId,
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      };
    } catch (err: any) {
      logger.error(`Login error: ${err.message}`);
      return reply.status(500).send({ error: 'Error interno al iniciar sesión' });
    }
  });

  // ─── REFRESH ──────────────────────────────────────────────────────────────
  server.post('/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    if (!refreshToken) {
      return reply.status(400).send({ error: 'refreshToken es requerido' });
    }

    try {
      const payload = server.jwt.verify(refreshToken) as any;
      if (payload.tokenType !== 'refresh') {
        return reply.status(401).send({ error: 'Token inválido' });
      }

      const { tokenType, iat, exp, ...cleanPayload } = payload;
      const accessToken = server.jwt.sign(cleanPayload, { expiresIn: ACCESS_TOKEN_EXPIRY });

      return { accessToken };
    } catch {
      return reply.status(401).send({ error: 'Refresh token inválido o expirado' });
    }
  });

  // ─── ME ───────────────────────────────────────────────────────────────────
  server.get('/auth/me', {
    preHandler: async (request, reply) => {
      try { await request.jwtVerify(); } catch { reply.status(401).send({ error: 'Unauthorized' }); }
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as any;
    try {
      const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
      if (!user) return reply.status(404).send({ error: 'Usuario no encontrado' });
      return { id: user.id, email: user.email, fullName: user.fullName, role: user.role, tenantId: user.tenantId };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}

function buildDefaultSchedule() {
  const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const schedule: Record<string, { open: string; close: string; active: boolean }> = {};
  days.forEach((day, i) => {
    schedule[day] = { open: '08:00', close: '18:00', active: i < 5 };
  });
  return schedule;
}
