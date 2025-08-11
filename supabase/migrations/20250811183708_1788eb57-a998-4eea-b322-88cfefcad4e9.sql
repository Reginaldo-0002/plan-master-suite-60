
-- Criar bucket para avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Criar política para que usuários possam fazer upload de seus próprios avatars
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Criar política para que usuários possam atualizar seus próprios avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para visualização pública dos avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Remover completamente a função de limpeza do sistema
DROP FUNCTION IF EXISTS public.system_cleanup(text, text[], boolean);

-- Remover tabela de logs de limpeza
DROP TABLE IF EXISTS public.system_cleanup_logs;

-- Garantir que usuários autenticados possam fazer INSERT em user_interactions para rastreamento
CREATE POLICY "Users can log their own interactions" ON public.user_interactions
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
