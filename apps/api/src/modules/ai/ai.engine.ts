import { ChannelType, AIAction } from '@saas/shared';
import { db, tenants, conversationState, messages, aiUnanswered } from '@saas/db';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../lib/logger';
import { llmClient } from '../../lib/llm-client';
import { buildClientContext } from './ai.context-builder';
import { buildSystemPrompt } from './ai.prompt-builder';
import { parseAIAction, extractFirstJson } from './ai.action-parser';
import { executeAIAction } from './ai.action-router';
import { searchKnowledge } from './knowledge/knowledge-base.service';
import { channelManager } from '../channels/core/channel-manager';

export interface AIEngineInput {
  tenantId: string;
  channel: ChannelType;
  customerId: string;
  customerPhone: string;
  customerName: string | null;
  message: string;
  conversationId: string;
}

export class AIEngine {
  async process(input: AIEngineInput): Promise<void> {
    logger.info(`AI Engine processing message for tenant ${input.tenantId}`);

    try {
      await this._processInternal(input);
    } catch (err: any) {
      logger.error(`AI Engine error for tenant ${input.tenantId}: ${err.message}`);

      try {
        await this.respond(input, 'Lo siento, estoy teniendo dificultades técnicas en este momento. Por favor intenta de nuevo en unos minutos o contacta directamente al negocio.');
      } catch (respondErr: any) {
        logger.error(`Failed to send fallback message: ${respondErr.message}`);
      }
    }
  }

  private async _processInternal(input: AIEngineInput): Promise<void> {
    let [state] = await db
      .select()
      .from(conversationState)
      .where(
        and(
          eq(conversationState.tenantId, input.tenantId),
          eq(conversationState.customerId, input.customerId),
          eq(conversationState.channel, input.channel)
        )
      )
      .limit(1);

    const historial = (state?.historial as any[]) || [];
    historial.push({ role: 'user', content: input.message });

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, input.tenantId)).limit(1);
    if (!tenant) return;

    // Build context using capabilities (no vertical parameter)
    const contextoCliente = await buildClientContext(input.tenantId, input.customerId);

    const kbResults = await searchKnowledge(input.tenantId, input.message);
    let foundInKB = false;
    if (kbResults.length > 0) {
      foundInKB = true;
      const kbContext = kbResults.map(r => `Q: ${r.question}\nA: ${r.answer}`).join('\n\n');
      historial.push({ 
        role: 'system', 
        content: `Información relevante encontrada en la base de conocimientos:\n\n${kbContext}\n\nUsa esta información para responder si es pertinente.` 
      });
    }

    // Build prompt using capabilities (no vertical parameter)
    const systemPrompt = await buildSystemPrompt({
      tenantId: input.tenantId,
      tenantName: tenant.name,
      channel: input.channel,
      contextoCliente,
      timezone: tenant.timezone,
    });

    const respuestaIA = await llmClient.chat({
      tenantId: input.tenantId,
      model: tenant.ai_model,
      systemPrompt,
      messages: historial.slice(-10),
      temperature: Number(tenant.ai_temperature),
      maxTokens: tenant.ai_max_tokens,
    });

    const accion = parseAIAction(respuestaIA);

    if (!foundInKB && !accion) {
        await db.insert(aiUnanswered).values({
            tenantId: input.tenantId,
            query: input.message,
            context: { channel: input.channel }
        });
    }

    historial.push({ role: 'assistant', content: respuestaIA });
    await db
      .insert(conversationState)
      .values({
        tenantId: input.tenantId,
        customerId: input.customerId,
        channel: input.channel,
        historial: historial.slice(-10),
      })
      .onConflictDoUpdate({
        target: [conversationState.tenantId, conversationState.customerId, conversationState.channel],
        set: { historial: historial.slice(-10), updatedAt: new Date() },
      });

    if (!accion) {
      const jsonFragment = extractFirstJson(respuestaIA);
      const textoLimpio = jsonFragment
        ? respuestaIA.replace(jsonFragment, '').trim()
        : respuestaIA.trim();
      if (textoLimpio) {
        await this.respond(input, textoLimpio);
      }
      return;
    }

    logger.info(`AI Engine detected action: ${accion.accion} for tenant ${input.tenantId}`);
    
    await executeAIAction({
      accion,
      tenantId: input.tenantId,
      channel: input.channel,
      customerId: input.customerId,
      customerPhone: input.customerPhone,
      contextoCliente,
      timezone: tenant.timezone,
      conversationId: input.conversationId,
    });
  }

  private async respond(input: AIEngineInput, text: string) {
    // Get externalId (instance name)
    const instanceName = `tenant_${input.tenantId}`;
    
    await channelManager.sendMessage(input.tenantId, input.channel, instanceName, input.customerPhone, {
      type: 'text',
      text,
    });

    // Save outbound message
    await db.insert(messages).values({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      direction: 'outbound',
      senderType: 'ai',
      content: { type: 'text', text } as any,
    });
  }
}

export const aiEngine = new AIEngine();
