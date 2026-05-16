import { db, aiUnanswered, tenants } from '@saas/db';
import { eq, and } from 'drizzle-orm';
import { llmClient } from '../lib/llm-client';
import { addKnowledge } from '../modules/ai/knowledge/knowledge-base.service';
import { logger } from '../lib/logger';

const MAX_PER_RUN = Number(process.env.AI_LEARNING_BATCH_SIZE) || 10;

export async function processUnansweredQueries(): Promise<void> {
  logger.info('Running AI learning job');

  try {
    const pending = await db
      .select()
      .from(aiUnanswered)
      .where(eq(aiUnanswered.isResolved, false))
      .limit(MAX_PER_RUN);

    logger.info(`Found ${pending.length} unanswered queries to process`);

    for (const entry of pending) {
      try {
        const [tenant] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, entry.tenantId))
          .limit(1);

        if (!tenant) {
          await db.update(aiUnanswered).set({ isResolved: true }).where(eq(aiUnanswered.id, entry.id));
          continue;
        }

        // Ask LLM to generate a best-effort answer based on the business context
        const systemPrompt = `Eres un asistente de "${tenant.name}". Genera una respuesta corta y útil para la pregunta de un cliente. Si no tienes suficiente contexto, indica que el equipo responderá pronto.`;

        const result = await llmClient.chat({
          tenantId: entry.tenantId,
          model: tenant.ai_model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: entry.query },
          ],
          temperature: 0.3,
          maxTokens: 300,
        });

        if (result?.content) {
          await addKnowledge(entry.tenantId, entry.query, result.content);
          logger.info(`Learned answer for query: "${entry.query.substring(0, 60)}..."`);
        }

        await db
          .update(aiUnanswered)
          .set({ isResolved: true })
          .where(eq(aiUnanswered.id, entry.id));
      } catch (err: any) {
        logger.error(`Failed to process unanswered query ${entry.id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    logger.error(`AI learning job error: ${err.message}`);
  }
}
