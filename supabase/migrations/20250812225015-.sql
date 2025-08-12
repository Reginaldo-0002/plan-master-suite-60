-- Verificar e ativar real-time para as tabelas necessárias
DO $$
BEGIN
  -- Garantir que as tabelas tenham REPLICA IDENTITY FULL
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_chat_restrictions' AND schemaname = 'public') THEN
    ALTER TABLE public.user_chat_restrictions REPLICA IDENTITY FULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public') THEN
    ALTER TABLE public.profiles REPLICA IDENTITY FULL;
  END IF;
END $$;

-- Adicionar tabelas à publicação real-time se ainda não estiverem
DO $$
BEGIN
  -- Verificar e adicionar user_chat_restrictions
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'user_chat_restrictions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_chat_restrictions;
  END IF;

  -- Verificar e adicionar profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;