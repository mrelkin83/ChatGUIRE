-- RLS for tables added after initial migration
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_quotes ON quotes
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_reservations ON reservations
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_kanban_columns ON kanban_columns
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Performance indexes on high-frequency query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created
    ON messages (conversation_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_tenant_external
    ON messages (tenant_id, external_id)
    WHERE external_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tenant_customer_channel
    ON conversations (tenant_id, customer_id, channel);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_tenant_status_scheduled
    ON appointments (tenant_id, status, scheduled_at)
    WHERE status = 'scheduled';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_customer_created
    ON orders (tenant_id, customer_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_tenant_status_created
    ON payments (tenant_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_daily_tenant_date
    ON analytics_daily (tenant_id, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_tenant_customer
    ON quotes (tenant_id, customer_id, created_at DESC);
