import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, integrations } from '@saas/db';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../../lib/logger';

const INTEGRATION_SPECS: Record<string, { label: string; category: string; icon: string; fields: { key: string; label: string; type: string; placeholder: string }[] }> = {
  openai: {
    label: 'OpenAI', category: 'llm', icon: '🧠',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-...' },
      { key: 'model', label: 'Modelo', type: 'text', placeholder: 'gpt-4o-mini' },
    ]
  },
  groq: {
    label: 'Groq', category: 'llm', icon: '⚡',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'gsk-...' },
      { key: 'model', label: 'Modelo', type: 'text', placeholder: 'llama-3.1-70b-versatile' },
    ]
  },
  openrouter: {
    label: 'OpenRouter', category: 'llm', icon: '🌐',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'or-...' },
      { key: 'model', label: 'Modelo', type: 'text', placeholder: 'openai/gpt-4o-mini' },
    ]
  },
  anthropic: {
    label: 'Anthropic (Claude)', category: 'llm', icon: '🧪',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-ant-...' },
      { key: 'model', label: 'Modelo', type: 'text', placeholder: 'claude-3-5-sonnet' },
    ]
  },
  n8n: {
    label: 'n8n', category: 'automation', icon: '⚙️',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'text', placeholder: 'https://n8n.tudominio.com/webhook/...' },
    ]
  },
  typebot: {
    label: 'Typebot', category: 'automation', icon: '🤖',
    fields: [
      { key: 'api_url', label: 'API URL', type: 'text', placeholder: 'https://typebot.io/api/...' },
    ]
  },
  chatwoot: {
    label: 'Chatwoot', category: 'crm', icon: '💬',
    fields: [
      { key: 'api_url', label: 'URL', type: 'text', placeholder: 'https://chatwoot.tudominio.com' },
      { key: 'api_token', label: 'API Token', type: 'password', placeholder: 'token...' },
    ]
  },
};

export async function integrationRoutes(server: FastifyInstance) {

  // Get integration specs (available providers)
  server.get('/integrations/specs', async (_request: FastifyRequest, reply: FastifyReply) => {
    return INTEGRATION_SPECS;
  });

  // List tenant integrations
  server.get('/integrations/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const items = await db.select().from(integrations)
        .where(eq(integrations.tenantId, tenantId))
        .orderBy(desc(integrations.createdAt));
      return items;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Create/update integration
  server.put('/integrations/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { provider, config, isActive, isPrimary } = request.body as {
      provider: string;
      config: Record<string, string>;
      isActive?: boolean;
      isPrimary?: boolean;
    };

    if (!provider || !config) {
      return reply.status(400).send({ error: 'provider and config are required' });
    }

    const spec = INTEGRATION_SPECS[provider];
    if (!spec) {
      return reply.status(400).send({ error: `Unknown provider: ${provider}` });
    }

    try {
      // If setting as primary LLM, unset others
      if (isPrimary && spec.category === 'llm') {
        await db.update(integrations).set({ isPrimary: false, updatedAt: new Date() })
          .where(and(
            eq(integrations.tenantId, tenantId),
            eq(integrations.category, 'llm')
          ));
      }

      const [integration] = await db.insert(integrations).values({
        tenantId,
        provider,
        category: spec.category,
        label: spec.label,
        config,
        isActive: isActive ?? true,
        isPrimary: isPrimary ?? false,
      }).onConflictDoUpdate({
        target: [integrations.tenantId, integrations.provider],
        set: {
          config,
          isActive: isActive ?? true,
          isPrimary: isPrimary ?? false,
          updatedAt: new Date(),
        },
      }).returning();

      return integration;
    } catch (err: any) {
      logger.error(`Failed to save integration: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Delete integration
  server.delete('/integrations/:tenantId/:provider', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, provider } = request.params as { tenantId: string; provider: string };
    try {
      await db.delete(integrations).where(
        and(eq(integrations.tenantId, tenantId), eq(integrations.provider, provider))
      );
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Get primary LLM integration
  server.get('/integrations/:tenantId/primary-llm', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const [primary] = await db.select().from(integrations)
        .where(and(
          eq(integrations.tenantId, tenantId),
          eq(integrations.category, 'llm'),
          eq(integrations.isActive, true),
          eq(integrations.isPrimary, true)
        ))
        .limit(1);

      return primary || null;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
