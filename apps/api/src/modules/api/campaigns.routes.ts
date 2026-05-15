import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, contactLists, contactListEntries, campaigns, campaignLogs, customers } from '@saas/db';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { logger } from '../../lib/logger';
import { evolutionClient } from '../../lib/evolution-api.client';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';

export async function campaignRoutes(server: FastifyInstance) {

  // ═══════════════════════════════════════════
  // CONTACT LISTS
  // ═══════════════════════════════════════════

  // Listar listas de contactos
  server.get('/contact-lists/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const lists = await db.select().from(contactLists)
        .where(eq(contactLists.tenantId, tenantId))
        .orderBy(desc(contactLists.createdAt));
      return lists;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Crear lista de contactos
  server.post('/contact-lists', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, name, description } = request.body as {
      tenantId: string;
      name: string;
      description?: string;
    };

    if (!tenantId || !name) {
      return reply.status(400).send({ error: 'tenantId and name are required' });
    }

    try {
      const [list] = await db.insert(contactLists).values({
        tenantId,
        name,
        description,
      }).returning();
      return list;
    } catch (err: any) {
      logger.error(`Failed to create contact list: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Eliminar lista de contactos
  server.delete('/contact-lists/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      await db.delete(contactLists).where(eq(contactLists.id, id));
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Agregar contacto a lista
  server.post('/contact-lists/:listId/entries', async (request: FastifyRequest, reply: FastifyReply) => {
    const { listId } = request.params as { listId: string };
    const { phone, name, customerId, variables } = request.body as {
      phone: string;
      name?: string;
      customerId?: string;
      variables?: Record<string, string>;
    };

    if (!phone) {
      return reply.status(400).send({ error: 'phone is required' });
    }

    try {
      const [entry] = await db.insert(contactListEntries).values({
        listId,
        phone,
        name,
        customerId,
        variables: variables || {},
      }).returning();

      // Update contact count
      await db.update(contactLists).set({
        contactCount: sql`${contactLists.contactCount} + 1`,
        updatedAt: new Date(),
      }).where(eq(contactLists.id, listId));

      return entry;
    } catch (err: any) {
      logger.error(`Failed to add contact to list: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Obtener contactos de una lista
  server.get('/contact-lists/:listId/entries', async (request: FastifyRequest, reply: FastifyReply) => {
    const { listId } = request.params as { listId: string };
    try {
      const entries = await db.select().from(contactListEntries)
        .where(eq(contactListEntries.listId, listId))
        .orderBy(desc(contactListEntries.createdAt));
      return entries;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Importar contactos desde clientes existentes
  server.post('/contact-lists/:listId/import-customers', async (request: FastifyRequest, reply: FastifyReply) => {
    const { listId } = request.params as { listId: string };
    const { tenantId } = request.body as { tenantId: string };

    try {
      const tenantCustomers = await db.select().from(customers)
        .where(eq(customers.tenantId, tenantId));

      let imported = 0;
      for (const customer of tenantCustomers) {
        if (customer.phone) {
          await db.insert(contactListEntries).values({
            listId,
            customerId: customer.id,
            phone: customer.phone,
            name: customer.fullName || customer.displayName || '',
          }).onConflictDoNothing();
          imported++;
        }
      }

      // Update contact count
      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(contactListEntries)
        .where(eq(contactListEntries.listId, listId));

      await db.update(contactLists).set({
        contactCount: countResult?.count || 0,
        updatedAt: new Date(),
      }).where(eq(contactLists.id, listId));

      return { success: true, imported };
    } catch (err: any) {
      logger.error(`Failed to import customers: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // CAMPAIGNS
  // ═══════════════════════════════════════════

  // Listar campañas
  server.get('/campaigns/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const campList = await db.select().from(campaigns)
        .where(eq(campaigns.tenantId, tenantId))
        .orderBy(desc(campaigns.createdAt));

      // Enrich with list name
      const enriched = await Promise.all(campList.map(async (camp) => {
        const [list] = await db.select().from(contactLists)
          .where(eq(contactLists.id, camp.listId)).limit(1);
        return {
          ...camp,
          listName: list?.name || 'Unknown',
        };
      }));

      return enriched;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Crear campaña
  server.post('/campaigns', async (request: FastifyRequest, reply: FastifyReply) => {
    const { 
      tenantId, name, listId, messages, scheduledAt, recurrence, 
      mediaUrl, mediaType 
    } = request.body as {
      tenantId: string;
      name: string;
      listId: string;
      messages: { text: string; active: boolean }[];
      scheduledAt?: string;
      recurrence?: string;
      mediaUrl?: string;
      mediaType?: string;
    };

    if (!tenantId || !name || !listId || !messages || messages.length === 0) {
      return reply.status(400).send({ error: 'tenantId, name, listId and messages are required' });
    }

    try {
      // Get contact count
      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(contactListEntries)
        .where(eq(contactListEntries.listId, listId));

      const [campaign] = await db.insert(campaigns).values({
        tenantId,
        name,
        listId,
        messages,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        recurrence: recurrence || 'once',
        nextRunAt: scheduledAt ? new Date(scheduledAt) : null,
        mediaUrl,
        mediaType,
        totalContacts: countResult?.count || 0,
        status: scheduledAt ? 'scheduled' : 'draft',
      }).returning();

      return campaign;
    } catch (err: any) {
      logger.error(`Failed to create campaign: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Obtener campaña
  server.get('/campaigns/:id/details', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      const [campaign] = await db.select().from(campaigns)
        .where(eq(campaigns.id, id)).limit(1);

      if (!campaign) {
        return reply.status(404).send({ error: 'Campaign not found' });
      }

      const logs = await db.select().from(campaignLogs)
        .where(eq(campaignLogs.campaignId, id))
        .orderBy(desc(campaignLogs.sentAt));

      return { campaign, logs };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Actualizar campaña
  server.put('/campaigns/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;

    try {
      const [campaign] = await db.update(campaigns).set({
        name: data.name,
        messages: data.messages,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        recurrence: data.recurrence,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        updatedAt: new Date(),
      }).where(eq(campaigns.id, id)).returning();

      return campaign;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Eliminar campaña
  server.delete('/campaigns/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      await db.delete(campaigns).where(eq(campaigns.id, id));
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Ejecutar campaña (enviar mensajes)
  server.post('/campaigns/:id/send', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const [campaign] = await db.select().from(campaigns)
        .where(eq(campaigns.id, id)).limit(1);

      if (!campaign) {
        return reply.status(404).send({ error: 'Campaign not found' });
      }

      if (campaign.status === 'running') {
        return reply.status(400).send({ error: 'Campaign is already running' });
      }

      // Update status to running
      await db.update(campaigns).set({
        status: 'running',
        updatedAt: new Date(),
      }).where(eq(campaigns.id, id));

      // Get contacts from list
      const contacts = await db.select().from(contactListEntries)
        .where(eq(contactListEntries.listId, campaign.listId));

      const messages = campaign.messages as { text: string; active: boolean }[];
      const activeMessages = messages.filter(m => m.active);

      if (activeMessages.length === 0) {
        await db.update(campaigns).set({ status: 'completed' }).where(eq(campaigns.id, id));
        return reply.status(400).send({ error: 'No active messages in campaign' });
      }

      // Send messages (with rate limiting simulation)
      let sentCount = 0;
      let failedCount = 0;

      for (const contact of contacts) {
        try {
          // Select random message variation
          const messageIndex = Math.floor(Math.random() * activeMessages.length);
          const message = activeMessages[messageIndex];

          // Replace variables
          let text = message.text;
          const variables = contact.variables as Record<string, string> || {};
          text = text.replace(/\{\{nombre\}\}/g, contact.name || '');
          text = text.replace(/\{\{telefono\}\}/g, contact.phone);
          Object.entries(variables).forEach(([key, value]) => {
            text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
          });

          // Send via Evolution API
          const instanceName = `tenant_${campaign.tenantId}`;
          await evolutionClient.sendMessage(instanceName, contact.phone, text);

          // Log success
          await db.insert(campaignLogs).values({
            campaignId: id,
            contactPhone: contact.phone,
            contactName: contact.name,
            messageIndex: messageIndex + 1,
            status: 'sent',
            sentAt: new Date(),
          });

          sentCount++;

          // Rate limiting: 30 msg/min
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err: any) {
          logger.error(`Failed to send to ${contact.phone}: ${err.message}`);
          
          await db.insert(campaignLogs).values({
            campaignId: id,
            contactPhone: contact.phone,
            contactName: contact.name,
            status: 'failed',
            errorMessage: err.message,
          });

          failedCount++;
        }
      }

      // Update campaign stats
      await db.update(campaigns).set({
        status: 'completed',
        sentCount,
        failedCount,
        updatedAt: new Date(),
      }).where(eq(campaigns.id, id));

      return { success: true, sentCount, failedCount };
    } catch (err: any) {
      logger.error(`Failed to execute campaign: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Pausar campaña
  server.post('/campaigns/:id/pause', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      await db.update(campaigns).set({
        status: 'paused',
        updatedAt: new Date(),
      }).where(eq(campaigns.id, id));
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Reanudar campaña
  server.post('/campaigns/:id/resume', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      await db.update(campaigns).set({
        status: 'scheduled',
        updatedAt: new Date(),
      }).where(eq(campaigns.id, id));
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Descargar plantilla Excel
  server.get('/contact-lists/template', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ws = XLSX.utils.aoa_to_sheet([
        ['nombre', 'telefono', 'email', 'ciudad', 'variable1', 'variable2', 'variable3'],
        ['Juan Pérez', '573001234567', 'juan@mail.com', 'Bogotá', '', '', ''],
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Contactos');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', 'attachment; filename=plantilla_contactos.xlsx');
      return reply.send(buffer);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Importar Excel/CSV
  server.post('/contact-lists/:listId/import-excel', async (request: FastifyRequest, reply: FastifyReply) => {
    const { listId } = request.params as { listId: string };
    
    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const buffer = await data.toBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

      if (rows.length === 0) {
        return reply.status(400).send({ error: 'File is empty' });
      }

      const columns = Object.keys(rows[0]);
      const phoneCol = columns.find(c => c.toLowerCase().includes('telefono') || c.toLowerCase().includes('phone') || c.toLowerCase() === 'celular');

      if (!phoneCol) {
        return reply.status(400).send({ error: 'No "telefono" or "phone" column found' });
      }

      const nameCol = columns.find(c => c.toLowerCase().includes('nombre') || c.toLowerCase().includes('name'));

      let imported = 0;
      let skipped = 0;

      for (const row of rows) {
        let phone = String(row[phoneCol] || '').replace(/[\s\-()]/g, '');
        if (!phone) { skipped++; continue; }
        if (!phone.startsWith('+') && !phone.startsWith('57')) {
          phone = '57' + phone;
        }
        if (phone.startsWith('+')) {
          phone = phone.substring(1);
        }

        const name = nameCol ? String(row[nameCol] || '') : '';
        
        const variables: Record<string, string> = {};
        for (const col of columns) {
          if (col !== phoneCol && col !== nameCol && row[col] !== undefined && row[col] !== '') {
            variables[col] = String(row[col]);
          }
        }

        try {
          await db.insert(contactListEntries).values({
            listId,
            phone,
            name,
            variables,
          }).onConflictDoNothing();
          imported++;
        } catch {
          skipped++;
        }
      }

      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(contactListEntries)
        .where(eq(contactListEntries.listId, listId));

      await db.update(contactLists).set({
        contactCount: countResult?.count || 0,
        updatedAt: new Date(),
      }).where(eq(contactLists.id, listId));

      return { imported, skipped, variables: columns.filter(c => c !== phoneCol && c !== nameCol) };
    } catch (err: any) {
      logger.error(`Excel import error: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });
}
