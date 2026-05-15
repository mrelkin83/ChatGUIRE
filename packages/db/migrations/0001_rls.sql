-- Enable RLS for all relevant tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_unanswered ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;

-- Basic policy: allow access if tenant_id matches the session variable 'app.current_tenant_id'
-- Note: 'tenants' table itself needs a policy for admins or to be readable by the system.

-- Tenants table: allow all reads/writes by superadmin (single DB user)
-- RLS only enforced for tenant-scoped tables below
CREATE POLICY tenant_isolation_tenants_select ON tenants
    FOR SELECT USING (true);
CREATE POLICY tenant_isolation_tenants_insert ON tenants
    FOR INSERT WITH CHECK (true);
CREATE POLICY tenant_isolation_tenants_update ON tenants
    FOR UPDATE USING (true);
CREATE POLICY tenant_isolation_tenants_delete ON tenants
    FOR DELETE USING (true);

CREATE POLICY tenant_isolation_users ON users
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_customers ON customers
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_products ON products
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_product_variants ON product_variants
    FOR ALL USING (product_id IN (SELECT id FROM products WHERE tenant_id = current_setting('app.current_tenant_id')::uuid));

CREATE POLICY tenant_isolation_categories ON categories
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_carts ON carts
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_cart_items ON cart_items
    FOR ALL USING (cart_id IN (SELECT id FROM carts WHERE tenant_id = current_setting('app.current_tenant_id')::uuid));

CREATE POLICY tenant_isolation_orders ON orders
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_order_items ON order_items
    FOR ALL USING (order_id IN (SELECT id FROM orders WHERE tenant_id = current_setting('app.current_tenant_id')::uuid));

CREATE POLICY tenant_isolation_appointments ON appointments
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_conversations ON conversations
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_messages ON messages
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_tenant_config ON tenant_config
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_channel_sessions ON channel_sessions
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_message_templates ON message_templates
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_payments ON payments
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_ai_knowledge ON ai_knowledge
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_ai_unanswered ON ai_unanswered
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_analytics_daily ON analytics_daily
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_conversation_state ON conversation_state
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
