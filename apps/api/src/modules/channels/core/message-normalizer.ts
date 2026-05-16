import { NormalizedMessage, ChannelType } from '@saas/shared';
import { v4 as uuidv4 } from 'uuid';

export const messageNormalizer = {
  // Example for Evolution API (WhatsApp)
  normalizeWhatsApp: (payload: any, tenantId: string): NormalizedMessage => {
    // This will be used inside WhatsAppDriver
    return {
      id: uuidv4(),
      channel: 'whatsapp',
      externalId: payload.instance || '',
      senderId: payload.data?.key?.remoteJid || '',
      senderName: payload.data?.pushName || null,
      senderPhone: payload.data?.key?.remoteJid?.split('@')[0] || '',
      content: {
        type: 'text', // simplification for now
        text: payload.data?.message?.conversation || payload.data?.message?.extendedTextMessage?.text || '',
      },
      timestamp: payload.data?.messageTimestamp ? new Date(payload.data.messageTimestamp * 1000) : new Date(),
      metadata: payload,
    };
  },

  // Add more normalization methods as we implement more drivers
};
