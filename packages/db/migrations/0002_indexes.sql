-- Performance indexes for common query patterns
-- Conversations and Messages
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_customer ON conversations(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_tenant_customer ON orders(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Appointments
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_customer ON appointments(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);

-- Carts
CREATE INDEX IF NOT EXISTS idx_carts_tenant_customer ON carts(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_tenant_external ON customers(tenant_id, external_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- AI & Analytics
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_tenant_id ON ai_knowledge(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_unanswered_tenant_id ON ai_unanswered(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_unanswered_is_resolved ON ai_unanswered(is_resolved);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_tenant_date ON analytics_daily(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_channel ON analytics_daily(channel);

-- Channel Sessions
CREATE INDEX IF NOT EXISTS idx_channel_sessions_tenant_channel ON channel_sessions(tenant_id, channel);

-- Conversation State
CREATE INDEX IF NOT EXISTS idx_conversation_state_tenant_customer ON conversation_state(tenant_id, customer_id, channel);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);

-- Tenant Config
CREATE INDEX IF NOT EXISTS idx_tenant_config_tenant_key ON tenant_config(tenant_id, key);
