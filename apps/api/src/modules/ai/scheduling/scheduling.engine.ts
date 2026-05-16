import { db, appointments, products, tenantConfig } from '@saas/db';
import { eq, and, between } from 'drizzle-orm';
import { dateHelpers } from '@saas/shared';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface GetSlotsParams {
  tenantId: string;
  servicioId: string;
  fecha: string; // YYYY-MM-DD
  timezone: string;
}

export interface Slot {
  hora: string; // HH:mm:ss
  disponible: boolean;
}

const DAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export async function getAvailableSlots(params: GetSlotsParams): Promise<Slot[]> {
  const { tenantId, servicioId, fecha, timezone } = params;

  // 1. Get service duration
  const [service] = await db.select().from(products).where(eq(products.id, servicioId)).limit(1);
  if (!service) return [];
  const duration = service.durationMinutes || 30;

  // 2. Load tenant schedule from config
  const configs = await db.select().from(tenantConfig).where(eq(tenantConfig.tenantId, tenantId));
  const configMap: Record<string, any> = {};
  for (const config of configs) {
    configMap[config.key] = config.value;
  }

  const schedule = configMap.schedule || {};
  
  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const dateObj = dayjs(fecha).tz(timezone);
  const dayOfWeek = dateObj.day();
  const dayKey = DAY_KEYS[dayOfWeek];
  
  const daySchedule = schedule[dayKey];
  
  // If day is not active, return empty
  if (!daySchedule || !daySchedule.active) {
    return [];
  }

  const openTime = daySchedule.open || '08:00:00';
  const closeTime = daySchedule.close || '18:00:00';

  // 3. Load appointments for that day (boundaries in tenant timezone)
  const startOfDay = dayjs.tz(`${fecha}T00:00:00`, timezone).toDate();
  const endOfDay = dayjs.tz(`${fecha}T23:59:59`, timezone).toDate();

  const dayAppointments = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.status, 'scheduled'),
        between(appointments.scheduledAt, startOfDay, endOfDay)
      )
    );

  // 4. Generate slots — interpret open/close times in tenant timezone
  const slots: Slot[] = [];
  let current = dayjs.tz(`${fecha}T${openTime}`, timezone);
  const end = dayjs.tz(`${fecha}T${closeTime}`, timezone);

  while (current.isBefore(end)) {
    const hora = current.format('HH:mm:ss');
    
    // Check if slot overlaps with any appointment
    const isOccupied = dayAppointments.some(app => {
      const appStart = dayjs(app.scheduledAt).tz(timezone);
      const appEnd = appStart.add(app.durationMinutes, 'minute');
      const slotStart = current;
      const slotEnd = current.add(duration, 'minute');

      return (slotStart.isBefore(appEnd) && slotEnd.isAfter(appStart));
    });

    slots.push({ hora, disponible: !isOccupied });
    current = current.add(duration, 'minute');
  }

  return slots;
}
