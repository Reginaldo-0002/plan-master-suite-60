-- Corrigir constraint de status da tabela tool_status

-- Verificar constraints existentes
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'tool_status'::regclass;

-- Remover constraint check existente se houver
ALTER TABLE tool_status DROP CONSTRAINT IF EXISTS tool_status_status_check;

-- Criar nova constraint que permite os 3 status
ALTER TABLE tool_status ADD CONSTRAINT tool_status_status_check 
CHECK (status IN ('active', 'maintenance', 'blocked'));

-- Verificar resultado
SELECT 'Constraint de status corrigida - agora permite active, maintenance e blocked!' as message;