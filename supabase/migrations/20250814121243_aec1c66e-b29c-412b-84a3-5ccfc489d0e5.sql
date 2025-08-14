-- Inserir planos padrão para demonstração
INSERT INTO plans (name, slug, price_cents, description, features, active) VALUES
  ('Plano Free', 'free', 0, 'Acesso básico à plataforma', '["Acesso limitado", "Suporte básico"]', true),
  ('Plano VIP', 'vip', 9700, 'Acesso completo com recursos avançados', '["Acesso total", "Suporte prioritário", "Recursos exclusivos"]', true),
  ('Plano Pro', 'pro', 19700, 'Plano profissional com todos os recursos', '["Tudo do VIP", "Ferramentas profissionais", "Suporte 24/7", "API access"]', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  active = EXCLUDED.active;