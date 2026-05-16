import { db, aiKnowledge } from '@saas/db';
import { eq, and, sql } from 'drizzle-orm';
import { llmClient } from '../../../lib/llm-client';
import { logger } from '../../../lib/logger';

export async function addKnowledge(tenantId: string, question: string, answer: string) {
  const embedding = await llmClient.createEmbedding(`${question} ${answer}`);
  
  await db.insert(aiKnowledge).values({
    tenantId,
    question,
    answer,
    embedding,
  });
}

export async function searchKnowledge(tenantId: string, query: string, limit = 3) {
  const embedding = await llmClient.createEmbedding(query);
  const embeddingSql = `[${embedding.join(',')}]`;

  // Search using cosine similarity (<-> is distance, so we want the smallest)
  const results = await db
    .select({
      question: aiKnowledge.question,
      answer: aiKnowledge.answer,
      similarity: sql<number>`1 - (${aiKnowledge.embedding} <=> ${embeddingSql}::vector)`
    })
    .from(aiKnowledge)
    .where(eq(aiKnowledge.tenantId, tenantId))
    .orderBy(sql`${aiKnowledge.embedding} <=> ${embeddingSql}::vector`)
    .limit(limit);

  return results.filter(r => r.similarity >= 0.75);
}
