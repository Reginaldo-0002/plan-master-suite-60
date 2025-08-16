-- Adicionar novos campos à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS purchase_source TEXT CHECK (purchase_source IN ('mercado_pago', 'whatsapp', 'kiwify', 'hotmart', 'caktor', 'nenhuma'));

-- Atualizar trigger para lidar com novos campos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    whatsapp, 
    purchase_source
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'whatsapp',
    NEW.raw_user_meta_data ->> 'purchase_source'
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role);
  
  RETURN NEW;
END;
$function$;