import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnValue([]),
  orderBy: vi.fn().mockReturnValue([]),
};

vi.mock('@saas/db', () => ({
  db: {
    select: vi.fn(() => mockChain),
  },
  customers: {},
  carts: {},
  cartItems: {},
  products: {},
  appointments: {},
  orders: {},
}));

import { buildClientContext } from './ai.context-builder';

describe('buildClientContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChain.limit.mockReturnValue([]);
    mockChain.orderBy.mockReturnValue([]);
  });

  it('returns esNuevo=true when customer not found', async () => {
    const result = await buildClientContext('tenant-1', 'retail_fashion', 'cust-1');
    expect(result.esNuevo).toBe(true);
    expect(result.nombre).toBeNull();
    expect(result.datos).toEqual({});
  });

  it('returns esNuevo=true for health vertical without customer', async () => {
    const result = await buildClientContext('tenant-1', 'health', 'cust-1');
    expect(result.esNuevo).toBe(true);
    expect(result).toHaveProperty('datos');
  });

  it('returns esNuevo=true for retail_tech without customer', async () => {
    const result = await buildClientContext('tenant-1', 'retail_tech', 'cust-1');
    expect(result.esNuevo).toBe(true);
    expect(result).toHaveProperty('datos');
  });

  it('returns empty data for unknown vertical', async () => {
    const result = await buildClientContext('tenant-1', 'unknown' as any, 'cust-1');
    expect(result.esNuevo).toBe(true);
    expect(result.datos).toEqual({});
  });
});
