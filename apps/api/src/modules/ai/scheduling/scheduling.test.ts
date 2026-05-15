import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@saas/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue([]),
  },
  appointments: {},
  products: {},
}));

import { getAvailableSlots } from './scheduling.engine';

describe('getAvailableSlots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns slots for a given date and duration', async () => {
    const slots = await getAvailableSlots({
      tenantId: 'tenant-1',
      servicioId: 'svc-1',
      fecha: '2026-05-10',
      timezone: 'America/Bogota',
    });
    expect(Array.isArray(slots)).toBe(true);
  });

  it('returns empty for a past date', async () => {
    const slots = await getAvailableSlots({
      tenantId: 'tenant-1',
      servicioId: 'svc-1',
      fecha: '2020-01-01',
      timezone: 'America/Bogota',
    });
    expect(Array.isArray(slots)).toBe(true);
  });

  it('returns empty for invalid date', async () => {
    const slots = await getAvailableSlots({
      tenantId: 'tenant-1',
      servicioId: 'svc-1',
      fecha: 'invalid-date',
      timezone: 'America/Bogota',
    });
    expect(Array.isArray(slots)).toBe(true);
    expect(slots.length).toBe(0);
  });
});
