import { db, customers, appointments, orders, products, carts, cartItems, tenantConfig, quotes, reservations } from '@saas/db';
import { eq, and, desc } from 'drizzle-orm';
import { dateHelpers } from '@saas/shared';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
dayjs.extend(timezone);

export interface ClientContext {
  esNuevo: boolean;
  clienteId?: string;
  nombre: string | null;
  datos: any;
}

export async function buildClientContext(tenantId: string, customerId: string): Promise<ClientContext> {
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!customer) return { esNuevo: true, nombre: null, datos: {} };

  const base = {
    esNuevo: false,
    clienteId: customer.id,
    nombre: customer.fullName || customer.displayName,
  };

  // Load tenant capabilities
  const configs = await db.select().from(tenantConfig).where(eq(tenantConfig.tenantId, tenantId));
  const configMap: Record<string, any> = {};
  for (const config of configs) {
    configMap[config.key] = config.value;
  }

  const capabilities: string[] = configMap.business_type?.capabilities || ['catalog', 'payments'];
  const timezone = configMap.timezone || 'America/Bogota';

  const datos: any = {};

  // Load appointments if capability is active
  if (capabilities.includes('appointments')) {
    const activeAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          eq(appointments.customerId, customer.id),
          eq(appointments.status, 'scheduled')
        )
      )
      .orderBy(desc(appointments.scheduledAt));

    datos.citas = activeAppointments.map(c => ({
      id: c.id,
      servicioNombre: c.serviceName,
      fecha: c.scheduledAt,
      fechaDisplay: dateHelpers.formatDisplayDateNatural(c.scheduledAt, timezone),
      horaDisplay: dateHelpers.formatTimeNatural(
        dayjs(c.scheduledAt).tz(timezone).format('HH:mm:ss')
      ),
      duracion: c.durationMinutes
    }));
  }

  // Load cart and orders if capability is active
  if (capabilities.includes('cart_orders')) {
    const [activeCart] = await db
      .select()
      .from(carts)
      .where(
        and(
          eq(carts.tenantId, tenantId),
          eq(carts.customerId, customer.id),
          eq(carts.status, 'active')
        )
      )
      .limit(1);

    if (activeCart) {
      const items = await db.select().from(cartItems).where(eq(cartItems.cartId, activeCart.id));
      datos.carrito = {
        items: items.map(i => ({
          productoNombre: i.productName,
          variante: i.variantInfo,
          cantidad: i.quantity,
          precio: i.unitPrice
        })),
        total: items.reduce((acc, i) => acc + Number(i.unitPrice) * i.quantity, 0)
      };
    } else {
      datos.carrito = { items: [], total: 0 };
    }

    const recentOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.customerId, customer.id)
        )
      )
      .orderBy(desc(orders.createdAt))
      .limit(3);

    datos.ultimosPedidos = recentOrders.map(o => ({
      numero: o.orderNumber,
      estado: o.status,
      total: o.total,
      fecha: dateHelpers.formatDisplayDateNatural(o.createdAt, timezone)
    }));
  }

  // Load reservations if capability is active
  if (capabilities.includes('reservations')) {
    const activeReservations = await db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.tenantId, tenantId),
          eq(reservations.customerId, customer.id),
          eq(reservations.status, 'confirmed')
        )
      )
      .orderBy(desc(reservations.reservedDate));

    datos.reservas = activeReservations.map(r => ({
      id: r.id,
      fecha: r.reservedDate,
      hora: r.reservedTime,
      personas: r.partySize,
      tipo: r.resourceType,
      nombre: r.resourceName
    }));
  }

  // Load quotes if capability is active
  if (capabilities.includes('quotes')) {
    const activeQuotes = await db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.tenantId, tenantId),
          eq(quotes.customerId, customer.id),
          eq(quotes.status, 'pending')
        )
      )
      .orderBy(desc(quotes.createdAt))
      .limit(3);

    datos.cotizaciones = activeQuotes.map(q => ({
      id: q.id,
      numero: q.quoteNumber,
      total: q.total,
      estado: q.status,
      validoHasta: q.validUntil
    }));
  }

  return { ...base, datos };
}
