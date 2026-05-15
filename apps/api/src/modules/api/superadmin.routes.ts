import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, tenants, users, saasPlans, saasResellers, saasAuditLogs, superadminUsers } from '@saas/db';
import { eq, desc, sql, count, sum } from 'drizzle-orm';
import { logger } from '../../lib/logger';
import os from 'os';
import bcrypt from 'bcrypt';

export async function superadminRoutes(server: FastifyInstance) {

  // ═══════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════

  server.post('/superadmin/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email: string; password: string };
    try {
      const [user] = await db.select().from(superadminUsers)
        .where(eq(superadminUsers.email, email)).limit(1);

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      await db.update(superadminUsers).set({ lastLogin: new Date() })
        .where(eq(superadminUsers.id, user.id));

      const token = server.jwt.sign({ id: user.id, role: user.role, type: 'superadmin' });
      return { token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // AUTH MIDDLEWARE (protege todo excepto login)
  // ═══════════════════════════════════════════

  server.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Saltar login
    if (request.routerPath === '/api/superadmin/login') return;

    try {
      await request.jwtVerify();
      const payload = request.user as any;
      if (payload.type !== 'superadmin') {
        return reply.status(403).send({ error: 'Forbidden: superadmin required' });
      }
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized: invalid or missing token' });
    }
  });

  // ═══════════════════════════════════════════
  // DASHBOARD KPIs
  // ═══════════════════════════════════════════

  server.get('/superadmin/dashboard', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const [totalTenants] = await db.select({ count: count() }).from(tenants);
      const [activeTenants] = await db.select({ count: count() }).from(tenants).where(eq(tenants.isActive, true));
      const [mrrResult] = await db.select({ total: sum(saasPlans.priceCop) }).from(saasPlans).innerJoin(tenants, eq(tenants.planId, saasPlans.id));

      const [totalMessages] = await db.select({ count: count() }).from(sql`messages`);
      const [totalResellers] = await db.select({ count: count() }).from(saasResellers);

      // Top 5 tenants
      const topTenants = await db.select({ id: tenants.id, name: tenants.name, isActive: tenants.isActive, createdAt: tenants.createdAt })
        .from(tenants).orderBy(desc(tenants.createdAt)).limit(5);

      // Plan distribution
      const plans = await db.select().from(saasPlans).orderBy(saasPlans.sortOrder);
      const planStats = await Promise.all(plans.map(async (plan) => {
        const [tCount] = await db.select({ count: count() }).from(tenants).where(eq(tenants.planId, plan.id));
        return { name: plan.name, slug: plan.slug, price: plan.priceCop, count: tCount?.count || 0 };
      }));

      return {
        totalTenants: totalTenants?.count || 0,
        activeTenants: activeTenants?.count || 0,
        mrr: Number(mrrResult?.total || 0),
        totalMessages: totalMessages?.count || 0,
        totalResellers: totalResellers?.count || 0,
        topTenants,
        planStats,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // TENANTS CRUD
  // ═══════════════════════════════════════════

  server.get('/superadmin/tenants', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
      return allTenants;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.post('/superadmin/tenants', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, vertical, planId, isDemo, demoExpiresAt } = request.body as any;
    try {
      const [tenant] = await db.insert(tenants).values({
        name, vertical: vertical || 'retail_fashion', planId, isDemo, demoExpiresAt: demoExpiresAt ? new Date(demoExpiresAt) : null,
      }).returning();
      return tenant;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  server.put('/superadmin/tenants/:id/suspend', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      await db.update(tenants).set({ isActive: false, suspendedAt: new Date() }).where(eq(tenants.id, id));
      return { success: true };
    } catch (err: any) { return reply.status(500).send({ error: err.message }); }
  });

  server.put('/superadmin/tenants/:id/activate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      await db.update(tenants).set({ isActive: true, suspendedAt: null }).where(eq(tenants.id, id));
      return { success: true };
    } catch (err: any) { return reply.status(500).send({ error: err.message }); }
  });

  // ═══════════════════════════════════════════
  // PLANS CRUD
  // ═══════════════════════════════════════════

  server.get('/superadmin/plans', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const plans = await db.select().from(saasPlans).orderBy(saasPlans.sortOrder);
      return plans;
    } catch (err: any) { return reply.status(500).send({ error: err.message }); }
  });

  server.post('/superadmin/plans', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, slug, priceCop, billingCycle, limits, features } = request.body as any;
    try {
      const [plan] = await db.insert(saasPlans).values({ name, slug, priceCop, billingCycle, limits, features }).returning();
      return plan;
    } catch (err: any) { return reply.status(500).send({ error: err.message }); }
  });

  server.put('/superadmin/plans/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    try {
      const [plan] = await db.update(saasPlans).set(data).where(eq(saasPlans.id, id)).returning();
      return plan;
    } catch (err: any) { return reply.status(500).send({ error: err.message }); }
  });

  // ═══════════════════════════════════════════
  // RESELLERS CRUD
  // ═══════════════════════════════════════════

  server.get('/superadmin/resellers', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const resellers = await db.select().from(saasResellers).orderBy(desc(saasResellers.createdAt));
      return resellers;
    } catch (err: any) { return reply.status(500).send({ error: err.message }); }
  });

  server.post('/superadmin/resellers', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, company, email, phone, commissionPct } = request.body as any;
    try {
      const referralCode = 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const [reseller] = await db.insert(saasResellers).values({ name, company, email, phone, commissionPct, referralCode }).returning();
      return reseller;
    } catch (err: any) { return reply.status(500).send({ error: err.message }); }
  });

  // ═══════════════════════════════════════════
  // SYSTEM HEALTH
  // ═══════════════════════════════════════════

  server.get('/superadmin/system-health', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memUsagePct = ((totalMem - freeMem) / totalMem * 100).toFixed(1);
      const cpuCount = os.cpus().length;
      const loadAvg = os.loadavg();

      return {
        memory: { total: (totalMem / 1024 / 1024 / 1024).toFixed(1) + ' GB', used: ((totalMem - freeMem) / 1024 / 1024 / 1024).toFixed(1) + ' GB', usagePct: memUsagePct },
        cpu: { cores: cpuCount, loadAvg1: loadAvg[0]?.toFixed(2), loadAvg5: loadAvg[1]?.toFixed(2) },
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
      };
    } catch (err: any) { return reply.status(500).send({ error: err.message }); }
  });

  // ═══════════════════════════════════════════
  // AUDIT LOGS
  // ═══════════════════════════════════════════

  server.get('/superadmin/audit-logs', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const logs = await db.select().from(saasAuditLogs)
        .orderBy(desc(saasAuditLogs.createdAt))
        .limit(100);
      return logs;
    } catch (err: any) { return reply.status(500).send({ error: err.message }); }
  });

  server.post('/superadmin/audit-logs', async (request: FastifyRequest, reply: FastifyReply) => {
    const { adminId, action, targetType, targetId, details } = request.body as any;
    try {
      const [log] = await db.insert(saasAuditLogs).values({
        adminId, action, targetType, targetId, details,
      }).returning();
      return log;
    } catch (err: any) { return reply.status(500).send({ error: err.message }); }
  });
}
