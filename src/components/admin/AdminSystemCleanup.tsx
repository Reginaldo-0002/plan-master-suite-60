
import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Users, FileText, Database, RotateCcw } from "lucide-react";
import { CleanupConfig } from "./cleanup/CleanupConfig";
import { CleanupOption } from "./cleanup/CleanupOption";
import { useCleanupLogic } from "./cleanup/useCleanupLogic";

const cleanupOptions = [
  {
    id: 'users',
    label: 'Usuários',
    description: 'Remove todos os usuários (exceto admin se marcado)',
    icon: Users,
    color: 'text-red-500'
  },
  {
    id: 'content',
    label: 'Conteúdo',
    description: 'Remove todo o conteúdo, tópicos e recursos',
    icon: FileText,
    color: 'text-orange-500'
  },
  {
    id: 'logs',
    label: 'Logs e Histórico',
    description: 'Remove logs de atividade, suporte e notificações',
    icon: Database,
    color: 'text-yellow-500'
  },
  {
    id: 'all',
    label: 'RESET COMPLETO',
    description: 'Remove TUDO do sistema (exceto admin se marcado)',
    icon: RotateCcw,
    color: 'text-red-600'
  }
];

export const AdminSystemCleanup = () => {
  const [confirmText, setConfirmText] = useState("");
  const [keepAdmin, setKeepAdmin] = useState(true);
  const { executeCleanup, loading, progress } = useCleanupLogic();

  const handleCleanupExecution = async (cleanupType: string) => {
    // Validação de entrada mais robusta
    if (confirmText.trim() !== 'DELETAR TUDO') {
      return;
    }

    // Confirmação adicional para operações críticas
    const option = cleanupOptions.find(opt => opt.id === cleanupType);
    const isHighRisk = cleanupType === 'all' || cleanupType === 'users';
    
    const confirmationMessage = isHighRisk 
      ? `ÚLTIMA CONFIRMAÇÃO: Tem certeza absoluta que deseja executar "${option?.label}"? Esta ação é IRREVERSÍVEL e de ALTO RISCO!`
      : `Confirma a execução de "${option?.label}"? Esta ação não pode ser desfeita.`;
    
    const confirmed = confirm(confirmationMessage);
    
    if (!confirmed) return;

    const success = await executeCleanup(cleanupType, keepAdmin);
    
    if (success) {
      // Reset do formulário apenas se a operação foi bem-sucedida
      setConfirmText("");
    }
  };

  const isConfirmationValid = confirmText.trim() === 'DELETAR TUDO';

  return (
    <div className="space-y-6">
      <Card className="border-red-500/20 bg-red-50/5">
        <CardHeader>
          <CardTitle className="text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            ZONA DE PERIGO - Limpeza do Sistema
          </CardTitle>
          <CardDescription>
            Esta área permite remover dados do sistema de forma permanente. 
            <strong> ESTAS AÇÕES SÃO IRREVERSÍVEIS!</strong>
            <br />
            Sistema atualizado com proteções de segurança aprimoradas.
          </CardDescription>
        </CardHeader>
      </Card>

      <CleanupConfig
        keepAdmin={keepAdmin}
        setKeepAdmin={setKeepAdmin}
        confirmText={confirmText}
        setConfirmText={setConfirmText}
      />

      <div className="grid gap-4">
        {cleanupOptions.map((option) => (
          <CleanupOption
            key={option.id}
            id={option.id}
            label={option.label}
            description={option.description}
            icon={option.icon}
            color={option.color}
            onExecute={handleCleanupExecution}
            disabled={loading || !isConfirmationValid}
            loading={loading}
            progress={progress}
          />
        ))}
      </div>
    </div>
  );
};
