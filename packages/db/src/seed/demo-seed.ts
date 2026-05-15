import { db, tenants, products, categories, tenantConfig } from '../index';

async function seed() {
  console.log('🌱 Seeding demo data...');

  // 1. Tenant Moda
  const [rosa] = await db.insert(tenants).values({
    name: 'Tienda Rosa',
    vertical: 'retail_fashion',
  }).returning();

  const [catModa] = await db.insert(categories).values({
    tenantId: rosa.id,
    name: 'Ropa Mujer',
  }).returning();

  await db.insert(products).values([
    {
      tenantId: rosa.id,
      categoryId: catModa.id,
      name: 'Vestido Verano',
      description: 'Vestido ligero para el calor',
      price: '120000',
      type: 'product',
    },
    {
      tenantId: rosa.id,
      categoryId: catModa.id,
      name: 'Blusa Seda',
      description: 'Blusa elegante de seda',
      price: '85000',
      type: 'product',
    }
  ]);

  // 2. Tenant Tech
  const [tech] = await db.insert(tenants).values({
    name: 'TechStore',
    vertical: 'retail_tech',
  }).returning();

  const [catTech] = await db.insert(categories).values({
    tenantId: tech.id,
    name: 'Accesorios',
  }).returning();

  await db.insert(products).values([
    {
      tenantId: tech.id,
      categoryId: catTech.id,
      name: 'Mouse Inalámbrico',
      description: 'Mouse ergonómico',
      price: '45000',
      type: 'product',
    },
    {
      tenantId: tech.id,
      categoryId: catTech.id,
      name: 'Teclado Mecánico',
      description: 'RGB Brown switches',
      price: '180000',
      type: 'product',
    }
  ]);

  // 3. Tenant Salud
  const [salud] = await db.insert(tenants).values({
    name: 'Dra. García',
    vertical: 'health',
  }).returning();

  const [catSalud] = await db.insert(categories).values({
    tenantId: salud.id,
    name: 'Consultas',
  }).returning();

  await db.insert(products).values([
    {
      tenantId: salud.id,
      categoryId: catSalud.id,
      name: 'Consulta General',
      description: 'Valoración inicial',
      price: '100000',
      type: 'service',
      durationMinutes: 30,
    },
    {
      tenantId: salud.id,
      categoryId: catSalud.id,
      name: 'Limpieza Dental',
      description: 'Profilaxis completa',
      price: '150000',
      type: 'service',
      durationMinutes: 45,
    }
  ]);

  console.log('✅ Seed completed!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
