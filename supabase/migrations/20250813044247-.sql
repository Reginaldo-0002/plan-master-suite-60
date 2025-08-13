-- Corrigir função para apagar todas as sessões
CREATE OR REPLACE FUNCTION public.admin_clear_all_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar se é admin usando user_roles ao invés de profiles
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem apagar todas as sessões';
  END IF;

  -- Apagar todas as sessões
  DELETE FROM user_sessions WHERE true;
  
  -- Log da ação
  RAISE NOTICE 'Todas as sessões foram apagadas pelo administrador %', auth.uid();
END;
$function$;