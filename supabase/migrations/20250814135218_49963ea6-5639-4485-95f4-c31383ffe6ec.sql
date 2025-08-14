-- Atualizar função create_platform_checkout para melhor suporte a checkout
CREATE OR REPLACE FUNCTION public.create_platform_checkout(
  platform_name text, 
  plan_slug text, 
  user_email text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  product_info RECORD;
  checkout_url text;
  target_user_id uuid;
BEGIN
  -- Buscar usuário atual se email não fornecido
  IF user_email IS NULL THEN
    SELECT auth.uid() INTO target_user_id;
    SELECT email INTO user_email 
    FROM auth.users 
    WHERE id = target_user_id;
  ELSE
    SELECT id INTO target_user_id
    FROM auth.users 
    WHERE email = user_email;
  END IF;
  
  -- Buscar produto da plataforma com informações do plano
  SELECT 
    pp.*, 
    p.name as plan_name, 
    p.price_cents,
    p.description as plan_description
  INTO product_info
  FROM platform_products pp
  JOIN plans p ON pp.plan_id = p.id
  WHERE pp.platform = platform_name::platform_enum
    AND p.slug = plan_slug
    AND pp.active = true
    AND p.active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Produto não encontrado para a plataforma: ' || platform_name || ' com plano: ' || plan_slug
    );
  END IF;
  
  -- Gerar URL de checkout baseado na plataforma
  IF product_info.checkout_url IS NOT NULL THEN
    checkout_url := product_info.checkout_url;
  ELSE
    CASE platform_name
      WHEN 'hotmart' THEN
        checkout_url := 'https://pay.hotmart.com/product/' || product_info.product_id;
      WHEN 'kiwify' THEN  
        checkout_url := 'https://kiwify.app/checkout/' || product_info.product_id;
      ELSE
        checkout_url := 'https://checkout.example.com/' || product_info.product_id;
    END CASE;
  END IF;
  
  -- Log da tentativa de checkout
  INSERT INTO audit_logs (
    action,
    area,
    actor_id,
    metadata
  ) VALUES (
    'checkout_attempted',
    'payments',
    target_user_id,
    jsonb_build_object(
      'platform', platform_name,
      'plan_slug', plan_slug,
      'product_id', product_info.product_id,
      'user_email', user_email,
      'checkout_url', checkout_url,
      'plan_name', product_info.plan_name,
      'price_cents', product_info.price_cents
    )
  );
  
  result := json_build_object(
    'success', true,
    'checkout_url', checkout_url,
    'platform', platform_name,
    'plan_name', product_info.plan_name,
    'plan_description', product_info.plan_description,
    'price_cents', product_info.price_cents,
    'product_id', product_info.product_id
  );
  
  RETURN result;
END;
$function$;

-- Inserir algumas ferramentas de exemplo na tabela tool_status
INSERT INTO tool_status (tool_name, status, message) VALUES
('Gerador de Conteúdo', 'active', 'Ferramenta para geração automática de conteúdo'),
('Analisador de Métricas', 'active', 'Análise detalhada de performance e métricas'),
('Automação de Posts', 'maintenance', 'Em manutenção para melhorias'),
('Editor de Imagens', 'active', 'Editor avançado para criação de imagens'),
('Calendário Editorial', 'active', 'Planejamento e organização de conteúdo')
ON CONFLICT (tool_name) DO UPDATE SET
  status = EXCLUDED.status,
  message = EXCLUDED.message,
  updated_at = now();

-- Inserir regras padrão na tabela admin_settings
INSERT INTO admin_settings (key, value) VALUES
('site_rules', jsonb_build_object(
  'content', '# Regras da Plataforma

## 1. Termos de Uso

Bem-vindo à nossa plataforma. Ao utilizar nossos serviços, você concorda com as seguintes regras:

### 1.1 Condutas Permitidas
- Uso respeitoso da plataforma
- Compartilhamento de conteúdo apropriado
- Respeito aos outros usuários

### 1.2 Condutas Proibidas
- Spam ou conteúdo não relacionado
- Assédio ou discriminação
- Violação de direitos autorais

## 2. Política de Privacidade

### 2.1 Coleta de Dados
Coletamos apenas os dados necessários para o funcionamento da plataforma.

### 2.2 Uso de Dados
Os dados são utilizados exclusivamente para melhorar sua experiência.

## 3. Sistema de Afiliados

### 3.1 Programa de Indicações
- Ganhe comissões ao indicar novos usuários
- Comissões são creditadas automaticamente
- Saques podem ser solicitados a qualquer momento

### 3.2 Regras de Comissão
- Comissão de 10% sobre vendas de indicados
- Mínimo de R$ 50,00 para saque
- Pagamentos via PIX em até 48h

## 4. Suporte

Para dúvidas ou problemas, entre em contato através do chat de suporte disponível na plataforma.

## 5. Alterações nas Regras

Estas regras podem ser alteradas a qualquer momento. Os usuários serão notificados sobre mudanças importantes.

---

*Última atualização: ' || to_char(now(), 'DD/MM/YYYY') || '*',
  'updated_at', now()::text,
  'version', '1.0'
))
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();