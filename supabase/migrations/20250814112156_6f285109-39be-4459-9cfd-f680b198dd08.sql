-- Módulo de Integrações & Webhooks
-- Criação de todas as tabelas necessárias com RLS e índices

-- 1. Planos base
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  interval TEXT NOT NULL DEFAULT 'monthly' CHECK (interval IN ('monthly', 'yearly', 'lifetime', 'one_time')),
  active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Produtos por plataforma
CREATE TYPE platform_enum AS ENUM ('hotmart', 'kiwify', 'caktor', 'generic');

CREATE TABLE IF NOT EXISTS public.platform_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  platform platform_enum NOT NULL,
  product_id TEXT NOT NULL,
  price_id TEXT,
  checkout_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(platform, product_id)
);

-- 3. Assinaturas dos usuários
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'pending');

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.plans(id),
  status subscription_status NOT NULL DEFAULT 'pending',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  external_customer_id TEXT,
  external_subscription_id TEXT,
  platform platform_enum,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'BRL',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, external_subscription_id)
);

-- 4. Endpoints de webhook
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider platform_enum NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  last_healthcheck_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Eventos de webhook recebidos
CREATE TYPE webhook_status AS ENUM ('received', 'processed', 'failed', 'discarded');

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider platform_enum NOT NULL,
  raw_headers JSONB NOT NULL,
  raw_payload JSONB NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  idempotency_key TEXT UNIQUE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  status webhook_status NOT NULL DEFAULT 'received',
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  canonical_event JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Bus de eventos interno
CREATE TYPE event_bus_status AS ENUM ('pending', 'dispatched', 'failed');

CREATE TABLE IF NOT EXISTS public.event_bus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  user_id UUID,
  subscription_id UUID REFERENCES public.subscriptions(id),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  dispatched_at TIMESTAMP WITH TIME ZONE,
  status event_bus_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

-- 7. Assinaturas de saída (webhooks out)
CREATE TABLE IF NOT EXISTS public.outbound_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_url TEXT NOT NULL,
  secret TEXT,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  last_delivery_at TIMESTAMP WITH TIME ZONE,
  failures_count INTEGER DEFAULT 0,
  backoff_state JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Entregas de saída
CREATE TYPE delivery_status AS ENUM ('pending', 'success', 'failed', 'retry');

CREATE TABLE IF NOT EXISTS public.outbound_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.event_bus(id),
  target_id UUID NOT NULL REFERENCES public.outbound_subscriptions(id),
  attempt INTEGER NOT NULL DEFAULT 1,
  status delivery_status NOT NULL DEFAULT 'pending',
  response_code INTEGER,
  response_body TEXT,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- 9. Configurações Meta Pixel/CAPI
CREATE TABLE IF NOT EXISTS public.tracking_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pixel_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  test_event_code TEXT,
  enable_client BOOLEAN NOT NULL DEFAULT true,
  enable_server BOOLEAN NOT NULL DEFAULT true,
  enable_dedup BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Eventos de tracking
CREATE TYPE tracking_source AS ENUM ('client', 'server');

CREATE TABLE IF NOT EXISTS public.tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_id TEXT NOT NULL,
  source tracking_source NOT NULL,
  user_id UUID,
  fb_response JSONB,
  error_message TEXT,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. Logs de auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  target_id UUID,
  diff JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency ON public.webhook_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_status ON public.webhook_events(provider, status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON public.webhook_events(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_external ON public.subscriptions(platform, external_subscription_id);

CREATE INDEX IF NOT EXISTS idx_event_bus_status ON public.event_bus(status);
CREATE INDEX IF NOT EXISTS idx_event_bus_type ON public.event_bus(type);
CREATE INDEX IF NOT EXISTS idx_event_bus_user_id ON public.event_bus(user_id);

CREATE INDEX IF NOT EXISTS idx_outbound_deliveries_status ON public.outbound_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_outbound_deliveries_next_retry ON public.outbound_deliveries(next_retry_at);

CREATE INDEX IF NOT EXISTS idx_platform_products_plan_platform ON public.platform_products(plan_id, platform);
CREATE INDEX IF NOT EXISTS idx_tracking_events_event_id ON public.tracking_events(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_area_created ON public.audit_logs(area, created_at DESC);

-- TRIGGERS para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhook_endpoints_updated_at BEFORE UPDATE ON public.webhook_endpoints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_outbound_subscriptions_updated_at BEFORE UPDATE ON public.outbound_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tracking_meta_updated_at BEFORE UPDATE ON public.tracking_meta FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS POLICIES

-- Plans: Admin pode tudo, usuários podem ler planos ativos
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage plans" ON public.plans
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Users can view active plans" ON public.plans
FOR SELECT USING (active = true);

-- Platform Products: Admin pode tudo, usuários podem ler produtos ativos
ALTER TABLE public.platform_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage platform products" ON public.platform_products
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Users can view active platform products" ON public.platform_products
FOR SELECT USING (
  active = true AND 
  EXISTS (SELECT 1 FROM public.plans WHERE id = platform_products.plan_id AND active = true)
);

-- Subscriptions: Admin pode tudo, usuários veem apenas suas próprias
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert subscriptions" ON public.subscriptions
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update subscriptions" ON public.subscriptions
FOR UPDATE USING (true);

-- Webhook Endpoints: Apenas admin
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhook endpoints" ON public.webhook_endpoints
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Webhook Events: Apenas admin para logs
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook events" ON public.webhook_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "System can insert webhook events" ON public.webhook_events
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update webhook events" ON public.webhook_events
FOR UPDATE USING (true);

-- Event Bus: Admin para logs, sistema para operação
ALTER TABLE public.event_bus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view event bus" ON public.event_bus
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "System can manage event bus" ON public.event_bus
FOR ALL USING (true);

-- Outbound Subscriptions: Apenas admin
ALTER TABLE public.outbound_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage outbound subscriptions" ON public.outbound_subscriptions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Outbound Deliveries: Admin para logs
ALTER TABLE public.outbound_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view outbound deliveries" ON public.outbound_deliveries
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "System can manage outbound deliveries" ON public.outbound_deliveries
FOR ALL USING (true);

-- Tracking Meta: Apenas admin
ALTER TABLE public.tracking_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tracking meta" ON public.tracking_meta
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Tracking Events: Admin para logs
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view tracking events" ON public.tracking_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "System can insert tracking events" ON public.tracking_events
FOR INSERT WITH CHECK (true);

-- Audit Logs: Apenas admin leitura
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "System can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (true);