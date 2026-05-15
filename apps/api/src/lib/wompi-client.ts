import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';

export class WompiClient {
  private axios: AxiosInstance;

  constructor() {
    this.axios = axios.create({
      baseURL: 'https://sandbox.wompi.co/v1', // use sandbox for dev
      headers: {
        Authorization: `Bearer ${process.env.WOMPI_SANDBOX_PRIVATE_KEY}`,
      },
    });
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
