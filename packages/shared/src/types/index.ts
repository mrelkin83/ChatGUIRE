import { ChannelType, AIActionType } from '../constants';

export interface NormalizedMessage {
  id: string;
  channel: ChannelType;
  externalId: string;
  senderId: string;
  senderName?: string;
  senderPhone?: string;
  content: {
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';
    text?: string;
    mediaUrl?: string;
    mimeType?: string;
    caption?: string;
    latitude?: number;
    longitude?: number;
  };
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface OutgoingMessage {
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';
  text?: string;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
}

export interface AIAction {
  accion: AIActionType;
  [key: string]: any;
}
