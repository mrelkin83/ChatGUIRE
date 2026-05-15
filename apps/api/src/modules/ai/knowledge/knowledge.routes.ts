import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, aiKnowledge, aiUnanswered } from '@saas/db';
import { eq, and, desc } from 'drizzle-orm';
import { llmClient } from '../../lib/llm-client';
import { logger } from '../../lib/logger';

export async function knowledgeRoutes(server: FastifyInstance) {

  // Listar entradas de conocimiento
  server.get('/knowledge/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };

    try {
      const entries = await db
        .select()
        .from(aiKnowledge)
        .where(eq(aiKnowledge.tenantId, tenantId))
        .orderBy(desc(aiKnowledge.createdAt));

      return { entries };
    } catch (err: any) {
      logger.error(`Failed to get knowledge entries: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to get knowledge entries' });
    }
  });

  // Crear entrada de conocimiento
  server.post('/knowledge', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, question, answer, category, keywords } = request.body as {
      tenantId: string;
      question: string;
      answer: string;
      category?: string;
      keywords?: string[];
    };

    if (!tenantId || !question || !answer) {
      return reply.status(400).send({ error: 'tenantId, question and answer are required' });
    }

    try {
      const embedding = await llmClient.createEmbedding(`${question} ${answer}`);

      await db.insert(aiKnowledge).values({
        tenantId,
        question,
        answer,
        category: category || 'general',
        keywords: keywords || [],
        embedding,
      });

      return { success: true };
    } catch (err: any) {
      logger.error(`Failed to create knowledge entry: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to create knowledge entry' });
    }
  });

  // Actualizar entrada de conocimiento
  server.put('/knowledge/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { question, answer, category, keywords } = request.body as {
      question?: string;
      answer?: string;
      category?: string;
      keywords?: string[];
    };

    try {
      const existing = await db.select().from(aiKnowledge).where(eq(aiKnowledge.id, id)).limit(1);
      if (existing.length === 0) {
        return reply.status(404).send({ error: 'Entry not found' });
      }

      const updates: any = {};
      if (question) updates.question = question;
      if (answer) updates.answer = answer;
      if (category) updates.category = category;
      if (keywords) updates.keywords = keywords;

      // Re-embed if question or answer changed
      if (question || answer) {
        const q = question || existing[0].question;
        const a = answer || existing[0].answer;
        updates.embedding = await llmClient.createEmbedding(`${q} ${a}`);
      }

      updates.updatedAt = new Date();

      await db.update(aiKnowledge).set(updates).where(eq(aiKnowledge.id, id));

      return { success: true };
    } catch (err: any) {
      logger.error(`Failed to update knowledge entry: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to update knowledge entry' });
    }
  });

  // Eliminar entrada de conocimiento
  server.delete('/knowledge/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      await db.delete(aiKnowledge).where(eq(aiKnowledge.id, id));
      return { success: true };
    } catch (err: any) {
      logger.error(`Failed to delete knowledge entry: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to delete knowledge entry' });
    }
  });

  // Listar preguntas sin respuesta
  server.get('/unanswered/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };

    try {
      const entries = await db
        .select()
        .from(aiUnanswered)
        .where(eq(aiUnanswered.tenantId, tenantId))
        .orderBy(desc(aiUnanswered.createdAt))
        .limit(50);

      return { entries };
    } catch (err: any) {
      logger.error(`Failed to get unanswered queries: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to get unanswered queries' });
    }
  });

  // Resolver pregunta sin respuesta (crear entrada KB)
  server.post('/unanswered/:id/resolve', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { answer } = request.body as { answer: string };

    if (!answer) {
      return reply.status(400).send({ error: 'answer is required' });
    }

    try {
      const existing = await db.select().from(aiUnanswered).where(eq(aiUnanswered.id, id)).limit(1);
      if (existing.length === 0) {
        return reply.status(404).send({ error: 'Entry not found' });
      }

      const entry = existing[0];

      // Create knowledge entry
      const embedding = await llmClient.createEmbedding(`${entry.question} ${answer}`);
      await db.insert(aiKnowledge).values({
        tenantId: entry.tenantId,
        question: entry.question,
        answer,
        category: 'resolved',
        embedding,
      });

      // Mark as resolved
      await db.update(aiUnanswered).set({ resolved: true }).where(eq(aiUnanswered.id, id));

      return { success: true };
    } catch (err: any) {
      logger.error(`Failed to resolve unanswered query: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to resolve unanswered query' });
    }
  });

  // Ignorar pregunta sin respuesta
  server.post('/unanswered/:id/ignore', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      await db.update(aiUnanswered).set({ ignored: true }).where(eq(aiUnanswered.id, id));
      return { success: true };
    } catch (err: any) {
      logger.error(`Failed to ignore unanswered query: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to ignore unanswered query' });
    }
  });
}
