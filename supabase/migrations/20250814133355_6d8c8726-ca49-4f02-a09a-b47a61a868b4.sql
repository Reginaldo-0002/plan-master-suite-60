-- Criar edge function para processar checkout direto
CREATE OR REPLACE FUNCTION public.create_platform_checkout(
  platform_name text,
  plan_slug text,
  user_email text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  
  -- Buscar produto da plataforma
  SELECT pp.*, p.name as plan_name, p.price_cents
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
      'error', 'Produto não encontrado para a plataforma: ' || platform_name
    );
  END IF;
  
  -- Se tem checkout_url direto, retornar
  IF product_info.checkout_url IS NOT NULL THEN
    checkout_url := product_info.checkout_url;
  ELSE
    -- Gerar URL de checkout baseado na plataforma
    CASE platform_name
      WHEN 'hotmart' THEN
        checkout_url := 'https://checkout.hotmart.com/product/' || product_info.product_id;
      WHEN 'kiwify' THEN  
        checkout_url := 'https://kiwify.app/checkout/' || product_info.product_id;
      ELSE
        checkout_url := product_info.checkout_url;
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
      'checkout_url', checkout_url
    )
  );
  
  result := json_build_object(
    'success', true,
    'checkout_url', checkout_url,
    'platform', platform_name,
    'plan_name', product_info.plan_name,
    'price_cents', product_info.price_cents
  );
  
  RETURN result;
END;
$$;