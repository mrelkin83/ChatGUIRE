import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';

export interface EvolutionInstanceConfig {
  instanceName: string;
  token?: string;
  number?: string;
}

export class EvolutionApiClient {
  private axios: AxiosInstance;

  constructor() {
    this.axios = axios.create({
      baseURL: process.env.EVOLUTION_API_URL || 'http://evolution-api:8080',
      timeout: 15_000,
      headers: {
        apikey: process.env.EVOLUTION_API_GLOBAL_KEY || '',
      },
    });
  }

  async createInstance(instanceName: string): Promise<any> {
    try {
      const { data } = await this.axios.post('/instance/create', {
        instanceName,
        token: '',
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      });
      return data;
    } catch (err: any) {
      logger.error(`Error creating instance ${instanceName}: ${err.message}`);
      throw err;
    }
  }

  async getInstance(instanceName: string): Promise<any> {
    try {
      const { data } = await this.axios.get(`/instance/connectionState/${instanceName}`);
      return data;
    } catch (err: any) {
      logger.error(`Error getting instance ${instanceName}: ${err.message}`);
      throw err;
    }
  }

  async logoutInstance(instanceName: string): Promise<void> {
    try {
      await this.axios.delete(`/instance/logout/${instanceName}`);
    } catch (err: any) {
      logger.error(`Error logging out instance ${instanceName}: ${err.message}`);
    }
  }

  async deleteInstance(instanceName: string): Promise<void> {
    try {
      await this.axios.delete(`/instance/delete/${instanceName}`);
    } catch (err: any) {
      logger.error(`Error deleting instance ${instanceName}: ${err.message}`);
    }
  }

  async sendMessage(instanceName: string, to: string, text: string): Promise<any> {
    try {
      const { data } = await this.axios.post(`/message/sendText/${instanceName}`, {
        number: to,
        options: {
          delay: 1200,
          presence: 'composing',
          linkPreview: false,
        },
        textMessage: {
          text,
        },
      });
      return data;
    } catch (err: any) {
      logger.error(`Error sending message to ${to} via ${instanceName}: ${err.message}`);
      throw err;
    }
  }

  async getQrCode(instanceName: string): Promise<string | null> {
    try {
      const { data } = await this.axios.get(`/instance/connect/${instanceName}`);
      return data.base64 || null;
    } catch (err: any) {
      logger.error(`Error getting QR for ${instanceName}: ${err.message}`);
      return null;
    }
  }
}

export const evolutionClient = new EvolutionApiClient();
