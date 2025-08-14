// Tipos para o módulo de Integrações & Webhooks

export type PlatformEnum = 'hotmart' | 'kiwify' | 'caktor' | 'generic';

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'pending';

export type WebhookStatus = 'received' | 'processed' | 'failed' | 'discarded';

export type EventBusStatus = 'pending' | 'dispatched' | 'failed';

export type DeliveryStatus = 'pending' | 'success' | 'failed' | 'retry';

export type TrackingSource = 'client' | 'server';

export type CanonicalEventType =
  | 'payment_succeeded' 
  | 'payment_failed'
  | 'subscription_created' 
  | 'subscription_canceled'
  | 'refund' 
  | 'chargeback'
  | 'checkout_started' 
  | 'plan_changed';

export interface CanonicalEvent {
  type: CanonicalEventType;
  external_order_id?: string;
  external_subscription_id?: string;
  user_email?: string;
  user_external_id?: string;
  plan_slug?: string;
  amount_cents?: number;
  currency?: string;
  occurred_at: string; // ISO
  raw: unknown;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  interval: string;
  active: boolean;
  description?: string;
  features: any;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface PlatformProduct {
  id: string;
  plan_id: string;
  platform: PlatformEnum;
  product_id: string;
  price_id?: string;
  checkout_url?: string;
  metadata: Record<string, any>;
  active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id?: string;
  status: SubscriptionStatus;
  current_period_start?: string;
  current_period_end?: string;
  external_customer_id?: string;
  external_subscription_id?: string;
  platform?: PlatformEnum;
  amount_cents?: number;
  currency: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WebhookEndpoint {
  id: string;
  provider: PlatformEnum;
  url: string;
  secret: string;
  active: boolean;
  description?: string;
  last_healthcheck_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  provider: PlatformEnum;
  raw_headers: any;
  raw_payload: any;
  received_at: string;
  idempotency_key: string;
  verified: boolean;
  status: WebhookStatus;
  error_message?: string;
  processed_at?: string;
  canonical_event?: any;
  created_at: string;
}

export interface EventBus {
  id: string;
  type: string;
  user_id?: string;
  subscription_id?: string;
  data: Record<string, any>;
  created_at: string;
  dispatched_at?: string;
  status: EventBusStatus;
  error_message?: string;
  retry_count: number;
}

export interface OutboundSubscription {
  id: string;
  target_url: string;
  secret?: string;
  description?: string;
  active: boolean;
  last_delivery_at?: string;
  failures_count: number;
  backoff_state: any;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface OutboundDelivery {
  id: string;
  event_id: string;
  target_id: string;
  attempt: number;
  status: DeliveryStatus;
  response_code?: number;
  response_body?: string;
  next_retry_at?: string;
  created_at: string;
  delivered_at?: string;
}

export interface TrackingMeta {
  id: string;
  pixel_id: string;
  access_token: string;
  test_event_code?: string;
  enable_client: boolean;
  enable_server: boolean;
  enable_dedup: boolean;
  active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TrackingEvent {
  id: string;
  event_name: string;
  event_id: string;
  source: TrackingSource;
  user_id?: string;
  fb_response?: any;
  error_message?: string;
  success: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  area: string;
  action: string;
  actor_id?: string;
  target_id?: string;
  diff?: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
}