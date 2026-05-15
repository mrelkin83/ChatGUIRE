import { NormalizedMessage, OutgoingMessage, ChannelType } from '@saas/shared';

export interface ChannelDriverConfig {
  tenantId: string;
  externalId: string; // instance name or username
  config: Record<string, any>;
}

export interface IChannelDriver {
  channel: ChannelType;
  
  // Instance management
  connect(config: ChannelDriverConfig): Promise<void>;
  disconnect(tenantId: string, externalId: string): Promise<void>;
  getStatus(tenantId: string, externalId: string): Promise<'connected' | 'disconnected' | 'connecting' | 'error'>;

  // Messaging
  sendMessage(tenantId: string, externalId: string, to: string, message: OutgoingMessage): Promise<string>; // returns message id
  
  // Webhook/Event handling (called by the API when a webhook hits)
  handleWebhook?(payload: any): Promise<NormalizedMessage | NormalizedMessage[] | null>;
  
  // Polling (optional, for scrapers like TikTok or IG poller)
  poll?(tenantId: string, externalId: string): Promise<NormalizedMessage[]>;
}
