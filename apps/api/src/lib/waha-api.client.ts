import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';

export class WahaApiClient {
  private axios: AxiosInstance;

  constructor() {
    this.axios = axios.create({
      baseURL: process.env.WAHA_API_URL || 'http://waha:3000',
      timeout: 30000,
    });
  }

  async createSession(sessionName: string): Promise<any> {
    try {
      const { data } = await this.axios.post('/api/sessions', {
        name: sessionName,
      });
      return data;
    } catch (err: any) {
      logger.error(`WAHA error creating session ${sessionName}: ${err.message}`);
      throw err;
    }
  }

  async getSession(sessionName: string): Promise<any> {
    try {
      const { data } = await this.axios.get(`/api/sessions/${sessionName}`);
      return data;
    } catch (err: any) {
      logger.error(`WAHA error getting session ${sessionName}: ${err.message}`);
      throw err;
    }
  }

  async deleteSession(sessionName: string): Promise<void> {
    try {
      await this.axios.delete(`/api/sessions/${sessionName}`);
    } catch (err: any) {
      logger.error(`WAHA error deleting session ${sessionName}: ${err.message}`);
    }
  }

  async getScreenshot(sessionName: string): Promise<string | null> {
    try {
      const { data } = await this.axios.get('/api/screenshot', {
        params: { session: sessionName },
        responseType: 'arraybuffer',
      });
      const base64 = Buffer.from(data, 'binary').toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (err: any) {
      logger.error(`WAHA error getting screenshot for ${sessionName}: ${err.message}`);
      return null;
    }
  }

  async sendText(sessionName: string, chatId: string, text: string): Promise<any> {
    try {
      // WAHA uses phone_number@c.us format
      const normalizedChatId = chatId.includes('@') ? chatId : `${chatId.replace(/\+/g, '')}@c.us`;
      
      const { data } = await this.axios.post('/api/sendText', {
        session: sessionName,
        chatId: normalizedChatId,
        text,
      });
      return data;
    } catch (err: any) {
      logger.error(`WAHA error sending message to ${chatId}: ${err.message}`);
      throw err;
    }
  }

  async getGroups(sessionName: string): Promise<any[]> {
    try {
      const { data } = await this.axios.get('/api/groups', {
        params: { session: sessionName },
      });
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      logger.error(`WAHA error getting groups for ${sessionName}: ${err.message}`);
      return [];
    }
  }

  async sendTextToGroup(sessionName: string, groupId: string, text: string): Promise<any> {
    try {
      const { data } = await this.axios.post('/api/sendText', {
        session: sessionName,
        chatId: groupId, // WAHA expects group JID like 123456789@g.us
        text,
      });
      return data;
    } catch (err: any) {
      logger.error(`WAHA error sending message to group ${groupId}: ${err.message}`);
      throw err;
    }
  }

  // Check if WAHA is available
  async healthCheck(): Promise<boolean> {
    try {
      await this.axios.get('/api/sessions', { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}

export const wahaClient = new WahaApiClient();
