import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';

const WOMPI_SANDBOX_URL = 'https://sandbox.wompi.co/v1';
const WOMPI_PROD_URL = 'https://production.wompi.co/v1';

export type WompiMode = 'sandbox' | 'production';

export class WompiClient {
  private axios: AxiosInstance;

  constructor(mode: WompiMode = 'sandbox', privateKey?: string) {
    const baseURL = mode === 'production' ? WOMPI_PROD_URL : WOMPI_SANDBOX_URL;
    const key = privateKey ?? (mode === 'production'
      ? process.env.WOMPI_PROD_PRIVATE_KEY
      : process.env.WOMPI_SANDBOX_PRIVATE_KEY) ?? '';

    this.axios = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });
  }

  static forTenant(tenantConfig: { wompiMode?: string; wompiPrivateKey?: string }): WompiClient {
    const mode: WompiMode = tenantConfig.wompiMode === 'production' ? 'production' : 'sandbox';
    return new WompiClient(mode, tenantConfig.wompiPrivateKey);
  }

  async createPaymentLink(params: {
    name: string;
    description: string;
    amountInCents: number;
    currency: string;
    singleUse: boolean;
    sku: string;
  }) {
    try {
      const { data } = await this.axios.post('/payment_links', {
        name: params.name,
        description: params.description,
        amount_in_cents: params.amountInCents,
        currency: params.currency,
        single_use: params.singleUse,
        collect_shipping_address: true,
        sku: params.sku,
      });
      return data.data;
    } catch (err: any) {
      logger.error(`Error creating Wompi payment link: ${err.message}`);
      throw err;
    }
  }

  async getTransaction(id: string) {
    try {
      const { data } = await this.axios.get(`/transactions/${id}`);
      return data.data;
    } catch (err: any) {
      logger.error(`Error getting Wompi transaction ${id}: ${err.message}`);
      throw err;
    }
  }
}

export const wompiClient = new WompiClient();
