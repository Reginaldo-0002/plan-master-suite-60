-- Habilitar real-time para as tabelas necessárias
ALTER TABLE public.user_chat_restrictions REPLICA IDENTITY FULL;
ALTER TABLE public.admin_settings REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Adicionar as tabelas à publicação do realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_chat_restrictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;