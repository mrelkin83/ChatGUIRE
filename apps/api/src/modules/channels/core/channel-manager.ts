import { ChannelType, OutgoingMessage } from '@saas/shared';
import { IChannelDriver, ChannelDriverConfig } from './channel-driver.interface';
import { logger } from '../../../lib/logger';

export class ChannelManager {
  private static instance: ChannelManager;
  private drivers: Map<ChannelType, IChannelDriver> = new Map();

  private constructor() {}

  public static getInstance(): ChannelManager {
    if (!ChannelManager.instance) {
      ChannelManager.instance = new ChannelManager();
    }
    return ChannelManager.instance;
  }

  public registerDriver(channel: ChannelType, driver: IChannelDriver): void {
    this.drivers.set(channel, driver);
    logger.info(`Registered driver for channel: ${channel}`);
  }

  public getDriver(channel: ChannelType): IChannelDriver {
    const driver = this.drivers.get(channel);
    if (!driver) {
      throw new Error(`No driver registered for channel: ${channel}`);
    }
    return driver;
  }

  public async connect(channel: ChannelType, config: ChannelDriverConfig): Promise<void> {
    const driver = this.getDriver(channel);
    await driver.connect(config);
  }

  public async disconnect(channel: ChannelType, tenantId: string, externalId: string): Promise<void> {
    const driver = this.getDriver(channel);
    await driver.disconnect(tenantId, externalId);
  }

  public async getStatus(channel: ChannelType, tenantId: string, externalId: string) {
    const driver = this.getDriver(channel);
    return await driver.getStatus(tenantId, externalId);
  }

  public async sendMessage(
    tenantId: string,
    channel: ChannelType,
    externalId: string,
    to: string,
    message: OutgoingMessage
  ): Promise<string> {
    const driver = this.getDriver(channel);
    logger.info(`Sending message to ${to} via ${channel} (${externalId})`);
    return await driver.sendMessage(tenantId, externalId, to, message);
  }
}

export const channelManager = ChannelManager.getInstance();
