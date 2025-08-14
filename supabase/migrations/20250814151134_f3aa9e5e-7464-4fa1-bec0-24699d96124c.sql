-- Verificar e corrigir constraint de status da tabela tool_status
-- Primeiro verificar quais constraints existem
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  consrc as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'tool_status'::regclass;

-- Verificar valores de status permitidos
SELECT DISTINCT status FROM tool_status;

-- Se houver constraint check restritiva, vamos removê-la e criar uma nova
ALTER TABLE tool_status DROP CONSTRAINT IF EXISTS tool_status_status_check;

-- Criar nova constraint que permite os 3 status
ALTER TABLE tool_status ADD CONSTRAINT tool_status_status_check 
CHECK (status IN ('active', 'maintenance', 'blocked'));

-- Verificar resultado
SELECT 'Constraint de status corrigida!' as message;