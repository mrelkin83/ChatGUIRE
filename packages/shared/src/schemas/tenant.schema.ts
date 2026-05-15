import { z } from 'zod';
import { CHANNELS, VERTICALS } from '../constants';

export const tenantSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  vertical: z.enum(VERTICALS),
  timezone: z.string().default('America/Bogota'),
  ai_model: z.string().default('gpt-4o-mini'),
  ai_temperature: z.number().min(0).max(2).default(0.7),
  ai_max_tokens: z.number().min(1).max(4000).default(500),
  isActive: z.boolean().default(true),
});

export type TenantSchema = z.infer<typeof tenantSchema>;
