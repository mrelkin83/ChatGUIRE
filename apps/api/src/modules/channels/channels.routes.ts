import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { channelManager } from './core/channel-manager';
import { evolutionClient } from '../../lib/evolution-api.client';
import { wahaClient } from '../../lib/waha-api.client';
import { logger } from '../../lib/logger';

export async function channelRoutes(server: FastifyInstance) {

  // ═══════════════════════════════════════════
  // WHATSAPP
  // ═══════════════════════════════════════════

  server.post('/whatsapp/connect', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.body as { tenantId: string };

    if (!tenantId) {
      return reply.status(400).send({ error: 'tenantId is required' });
    }

    const instanceName = `tenant_${tenantId}`;
    
    await channelManager.connect('whatsapp', {
      tenantId,
      externalId: instanceName,
      config: {},
    });
    
    return { status: 'creating', instanceName };
  });

  server.get('/whatsapp/qr/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const instanceName = `tenant_${tenantId}`;

    try {
      const qr = await evolutionClient.getQrCode(instanceName);
      return { qr };
    } catch (err: any) {
      logger.error(`Failed to get QR for ${instanceName}: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to get QR code', details: err.message });
    }
  });

  server.get('/whatsapp/status/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const instanceName = `tenant_${tenantId}`;

    try {
      const status = await channelManager.getStatus('whatsapp', tenantId, instanceName);
      return { status };
    } catch (err: any) {
      return { status: 'disconnected' };
    }
  });

  server.post('/whatsapp/disconnect', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.body as { tenantId: string };
    if (!tenantId) return reply.status(400).send({ error: 'tenantId is required' });

    const instanceName = `tenant_${tenantId}`;
    try {
      await channelManager.disconnect('whatsapp', tenantId, instanceName);
      return { status: 'disconnected' };
    } catch (err: any) {
      logger.error(`Failed to disconnect WhatsApp: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to disconnect', details: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // INSTAGRAM
  // ═══════════════════════════════════════════

  server.post('/instagram/connect', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, username, password } = request.body as { 
      tenantId: string; 
      username: string; 
      password: string; 
    };

    if (!tenantId || !username || !password) {
      return reply.status(400).send({ error: 'tenantId, username and password are required' });
    }

    try {
      await channelManager.connect('instagram', {
        tenantId,
        externalId: username,
        config: { password },
      });
      return { status: 'connected', username };
    } catch (err: any) {
      logger.error(`Failed to connect Instagram for ${tenantId}: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to connect Instagram', details: err.message });
    }
  });

  server.get('/instagram/status/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };

    try {
      const status = await channelManager.getStatus('instagram', tenantId, tenantId);
      return { status };
    } catch (err: any) {
      logger.error(`Failed to get Instagram status for ${tenantId}: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to get status', details: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // FACEBOOK
  // ═══════════════════════════════════════════

  server.post('/facebook/connect', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, pageId, accessToken, pageName } = request.body as { 
      tenantId: string; 
      pageId: string; 
      accessToken: string;
      pageName?: string;
    };

    if (!tenantId || !pageId || !accessToken) {
      return reply.status(400).send({ error: 'tenantId, pageId and accessToken are required' });
    }

    try {
      await channelManager.connect('facebook', {
        tenantId,
        externalId: pageId,
        config: { pageId, accessToken, pageName },
      });
      return { status: 'connected', pageId };
    } catch (err: any) {
      logger.error(`Failed to connect Facebook for ${tenantId}: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to connect Facebook', details: err.message });
    }
  });

  server.get('/facebook/status/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };

    try {
      const status = await channelManager.getStatus('facebook', tenantId, tenantId);
      return { status };
    } catch (err: any) {
      logger.error(`Failed to get Facebook status for ${tenantId}: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to get status', details: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // TIKTOK
  // ═══════════════════════════════════════════

  server.post('/tiktok/connect', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, username, sessionCookies } = request.body as { 
      tenantId: string; 
      username: string; 
      sessionCookies?: string;
    };

    if (!tenantId || !username) {
      return reply.status(400).send({ error: 'tenantId and username are required' });
    }

    try {
      await channelManager.connect('tiktok', {
        tenantId,
        externalId: username,
        config: { username, sessionCookies },
      });
      return { status: 'connected', username };
    } catch (err: any) {
      logger.error(`Failed to connect TikTok for ${tenantId}: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to connect TikTok', details: err.message });
    }
  });

  server.get('/tiktok/status/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };

    try {
      const status = await channelManager.getStatus('tiktok', tenantId, tenantId);
      return { status };
    } catch (err: any) {
      logger.error(`Failed to get TikTok status for ${tenantId}: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to get status', details: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // WHATSAPP VIA WAHA (alternative provider)
  // ═══════════════════════════════════════════

  server.post('/whatsapp-waha/connect', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.body as { tenantId: string };

    if (!tenantId) {
      return reply.status(400).send({ error: 'tenantId is required' });
    }

    const sessionName = `tenant_${tenantId}`;

    try {
      await channelManager.connect('whatsapp-waha', {
        tenantId,
        externalId: sessionName,
        config: {},
      });
      return { status: 'creating', sessionName, provider: 'waha' };
    } catch (err: any) {
      logger.error(`WAHA connect error: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to connect WAHA', details: err.message });
    }
  });

  server.get('/whatsapp-waha/qr/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const sessionName = `tenant_${tenantId}`;

    try {
      const qr = await wahaClient.getScreenshot(sessionName);
      return { qr };
    } catch (err: any) {
      logger.error(`WAHA QR error: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to get QR', details: err.message });
    }
  });

  server.get('/whatsapp-waha/status/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const sessionName = `tenant_${tenantId}`;

    try {
      const status = await channelManager.getStatus('whatsapp-waha', tenantId, sessionName);
      return { status, provider: 'waha' };
    } catch (err: any) {
      logger.error(`WAHA status error: ${err.message}`);
      return { status: 'disconnected', provider: 'waha' };
    }
  });

  server.get('/whatsapp-waha/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    const healthy = await wahaClient.healthCheck();
    return { available: healthy };
  });

  // ═══════════════════════════════════════════
  // GROUPS (via WAHA)
  // ═══════════════════════════════════════════

  server.get('/whatsapp-waha/groups/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const sessionName = `tenant_${tenantId}`;

    try {
      const groups = await wahaClient.getGroups(sessionName);
      return groups;
    } catch (err: any) {
      logger.error(`WAHA groups error: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to get groups', details: err.message });
    }
  });

  server.post('/whatsapp-waha/groups/send', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, groupId, text } = request.body as {
      tenantId: string;
      groupId: string;
      text: string;
    };

    if (!tenantId || !groupId || !text) {
      return reply.status(400).send({ error: 'tenantId, groupId and text are required' });
    }

    try {
      const sessionName = `tenant_${tenantId}`;
      const result = await wahaClient.sendTextToGroup(sessionName, groupId, text);
      return result;
    } catch (err: any) {
      logger.error(`WAHA group send error: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to send group message', details: err.message });
    }
  });
}
