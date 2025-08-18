-- Verificar e corrigir a tabela user_roles para suportar ON CONFLICT
-- Adicionar constraint único se necessário
DO $$
BEGIN
    -- Verificar se o constraint único já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_roles_user_id_key' 
        AND table_name = 'user_roles'
    ) THEN
        -- Primeiro, remover duplicatas se existirem
        DELETE FROM user_roles 
        WHERE id IN (
            SELECT id FROM (
                SELECT id, 
                       ROW_NUMBER() OVER (
                           PARTITION BY user_id 
                           ORDER BY assigned_at DESC
                       ) as rn
                FROM user_roles
            ) t 
            WHERE t.rn > 1
        );
        
        -- Adicionar constraint único
        ALTER TABLE user_roles 
        ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
    END IF;
END $$;