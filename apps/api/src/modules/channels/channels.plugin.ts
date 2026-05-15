import { FastifyInstance } from 'fastify';
import { channelManager } from './core/channel-manager';
import { WhatsAppDriver } from './drivers/whatsapp/whatsapp.driver';
import { WahaDriver } from './drivers/waha/waha.driver';
import { InstagramDriver } from './drivers/instagram/instagram.driver';
import { FacebookDriver } from './drivers/facebook/facebook.driver';
import { TikTokDriver } from './drivers/tiktok/tiktok.driver';
import { channelRoutes } from './channels.routes';

export async function channelsPlugin(server: FastifyInstance) {
  // Register drivers
  channelManager.registerDriver('whatsapp', new WhatsAppDriver());
  channelManager.registerDriver('whatsapp-waha', new WahaDriver() as any);
  channelManager.registerDriver('instagram', new InstagramDriver());
  channelManager.registerDriver('facebook', new FacebookDriver());
  channelManager.registerDriver('tiktok', new TikTokDriver());

  // Register routes
  server.register(channelRoutes, { prefix: '/channels' });
}
