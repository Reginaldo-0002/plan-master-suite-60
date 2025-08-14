-- Inserir planos padrão na tabela plans
INSERT INTO plans (name, slug, price_cents, description, features, active) VALUES
('Free', 'free', 0, 'Plano gratuito para começar', '["Acesso básico ao conteúdo", "Suporte por email", "Tutoriais essenciais", "Dashboard básico"]'::jsonb, true),
('VIP', 'vip', 9700, 'Para usuários avançados', '["Tudo do plano Free", "Acesso a conteúdo premium", "Suporte prioritário", "Ferramentas avançadas", "Webinars exclusivos", "Comunidade VIP"]'::jsonb, true),
('PRO', 'pro', 19700, 'Para profissionais sérios', '["Tudo do plano VIP", "Acesso ilimitado a tudo", "Suporte 24/7", "Consultoria individual", "Recursos beta", "Certificações", "Mentorias ao vivo"]'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  updated_at = now();

-- Inserir produtos de plataforma de exemplo para Kiwify
INSERT INTO platform_products (platform, product_id, plan_id, active, metadata) 
SELECT 
  'kiwify'::platform_enum,
  'produto-vip-kiwify',
  p.id,
  true,
  jsonb_build_object('price', 97, 'currency', 'BRL')
FROM plans p WHERE p.slug = 'vip'
ON CONFLICT DO NOTHING;

INSERT INTO platform_products (platform, product_id, plan_id, active, metadata) 
SELECT 
  'kiwify'::platform_enum,
  'produto-pro-kiwify',
  p.id,
  true,
  jsonb_build_object('price', 197, 'currency', 'BRL')
FROM plans p WHERE p.slug = 'pro'
ON CONFLICT DO NOTHING;

-- Inserir produtos de plataforma de exemplo para Hotmart
INSERT INTO platform_products (platform, product_id, plan_id, active, metadata) 
SELECT 
  'hotmart'::platform_enum,
  'produto-vip-hotmart',
  p.id,
  true,
  jsonb_build_object('price', 97, 'currency', 'BRL')
FROM plans p WHERE p.slug = 'vip'
ON CONFLICT DO NOTHING;

INSERT INTO platform_products (platform, product_id, plan_id, active, metadata) 
SELECT 
  'hotmart'::platform_enum,
  'produto-pro-hotmart',
  p.id,
  true,
  jsonb_build_object('price', 197, 'currency', 'BRL')
FROM plans p WHERE p.slug = 'pro'
ON CONFLICT DO NOTHING;