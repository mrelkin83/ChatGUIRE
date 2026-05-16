import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from './logger';

export interface LLMChatInput {
  model?: string;
  systemPrompt: string;
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  maxTokens?: number;
  temperature?: number;
  tenantId?: string; // Para leer la integración del tenant
}

interface IntegrationConfig {
  provider: string;
  config: Record<string, string>;
}

export class LLMClient {
  private _openai: OpenAI | null = null;
  private _anthropic: Anthropic | null = null;
  private _currentProvider: string = 'openai';
  private _tenantConfig: IntegrationConfig | null = null;

  private get openai(): OpenAI {
    if (!this._openai) {
      this._openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
      });
    }
    return this._openai;
  }

  private get anthropic(): Anthropic {
    if (!this._anthropic) {
      this._anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || 'sk-ant-placeholder',
      });
    }
    return this._anthropic;
  }

  async loadTenantIntegration(tenantId: string): Promise<void> {
    try {
      const { db, integrations } = require('@saas/db');
      const { eq, and } = require('drizzle-orm');

      const [primary] = await db.select().from(integrations)
        .where(and(
          eq(integrations.tenantId, tenantId),
          eq(integrations.category, 'llm'),
          eq(integrations.isActive, true),
          eq(integrations.isPrimary, true)
        ))
        .limit(1);

      if (primary) {
        this._tenantConfig = {
          provider: primary.provider,
          config: primary.config as Record<string, string>,
        };
        this._currentProvider = primary.provider;
        logger.info(`LLM using tenant integration: ${primary.provider}`);
      } else {
        this._tenantConfig = null;
        this._currentProvider = 'openai';
      }
    } catch {
      this._tenantConfig = null;
      this._currentProvider = 'openai';
    }
  }

  async chat(input: LLMChatInput): Promise<string> {
    // Load tenant config per-request to avoid shared-state race conditions
    let provider = this._currentProvider;
    let config: IntegrationConfig | null = null;
    if (input.tenantId) {
      try {
        const { db, integrations } = require('@saas/db');
        const { eq, and } = require('drizzle-orm');
        const [primary] = await db.select().from(integrations)
          .where(and(
            eq(integrations.tenantId, input.tenantId),
            eq(integrations.category, 'llm'),
            eq(integrations.isActive, true),
            eq(integrations.isPrimary, true)
          ))
          .limit(1);
        if (primary) {
          provider = primary.provider;
          config = { provider: primary.provider, config: primary.config as Record<string, string> };
        }
      } catch {}
    }

    try {
      switch (provider) {
        case 'openai':
          return await this.chatOpenAI(input, config);
        case 'groq':
          return await this.chatGroq(input, config);
        case 'openrouter':
          return await this.chatOpenRouter(input, config);
        case 'anthropic':
          return await this.chatAnthropic(input, config);
        default:
          return await this.chatOpenAI(input, config);
      }
    } catch (err: any) {
      logger.error(`LLM error (${provider}): ${err.message}`);

      // Fallback to OpenAI global default if primary provider is not already OpenAI
      if (provider !== 'openai') {
        logger.warn(`Falling back to OpenAI after ${provider} failure`);
        try {
          return await this.chatOpenAI(input, null);
        } catch (fallbackErr: any) {
          logger.error(`LLM fallback (openai) also failed: ${fallbackErr.message}`);
          throw fallbackErr;
        }
      }

      throw err;
    }
  }

  private async chatOpenAI(input: LLMChatInput, config: IntegrationConfig | null): Promise<string> {
    const apiKey = config?.config?.api_key || process.env.OPENAI_API_KEY || '';
    const model = config?.config?.model || input.model || process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini';

    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: input.systemPrompt },
        ...input.messages.map(m => ({ role: m.role as any, content: m.content })),
      ],
      max_tokens: input.maxTokens || 500,
      temperature: input.temperature || 0.7,
    });

    return response.choices[0].message.content || '';
  }

  private async chatGroq(input: LLMChatInput, config: IntegrationConfig | null): Promise<string> {
    const apiKey = config?.config?.api_key || process.env.GROQ_API_KEY || '';
    const model = config?.config?.model || input.model || 'llama-3.1-70b-versatile';

    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: input.systemPrompt },
        ...input.messages.map(m => ({ role: m.role as any, content: m.content })),
      ],
      max_tokens: input.maxTokens || 500,
      temperature: input.temperature || 0.7,
    });

    return response.choices[0].message.content || '';
  }

  private async chatOpenRouter(input: LLMChatInput, config: IntegrationConfig | null): Promise<string> {
    const apiKey = config?.config?.api_key || process.env.OPENROUTER_API_KEY || '';
    const model = config?.config?.model || input.model || 'openai/gpt-4o-mini';

    const client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.WEB_BASE_URL || 'http://localhost:3000',
      },
    });

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: input.systemPrompt },
        ...input.messages.map(m => ({ role: m.role as any, content: m.content })),
      ],
      max_tokens: input.maxTokens || 500,
      temperature: input.temperature || 0.7,
    });

    return response.choices[0].message.content || '';
  }

  private async chatAnthropic(input: LLMChatInput, config: IntegrationConfig | null): Promise<string> {
    const apiKey = config?.config?.api_key || process.env.ANTHROPIC_API_KEY || '';
    const model = config?.config?.model || input.model || 'claude-3-5-sonnet-20241022';

    const client = new Anthropic({ apiKey });

    // Filter out system messages except the first one
    const systemMsg = input.messages.find(m => m.role === 'system')?.content || input.systemPrompt;
    const userMsgs = input.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await client.messages.create({
      model,
      max_tokens: input.maxTokens || 500,
      system: systemMsg,
      messages: userMsgs as any,
    });

    const textBlock = response.content.find((block: any) => block.type === 'text');
    return (textBlock as any)?.text || '';
  }

  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch (err: any) {
      logger.error(`Embedding error: ${err.message}`);
      throw err;
    }
  }
}

export const llmClient = new LLMClient();
