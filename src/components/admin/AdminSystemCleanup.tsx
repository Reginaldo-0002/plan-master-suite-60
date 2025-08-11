
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Trash2, Database, Users, FileText, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";

interface CleanupResult {
  success: boolean;
  records_deleted: number;
  cleanup_type: string;
}

export const AdminSystemCleanup = () => {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [keepAdmin, setKeepAdmin] = useState(true);
  const { toast } = useToast();
  const { handleAsyncError } = useErrorHandler();

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

  const executeCleanup = async (cleanupType: string) => {
    // Validação de entrada mais robusta
    if (confirmText.trim() !== 'DELETAR TUDO') {
      toast({
        title: "Erro de Confirmação",
        description: "Digite exatamente 'DELETAR TUDO' para confirmar (sem aspas)",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`ÚLTIMA CONFIRMAÇÃO: Tem certeza absoluta que deseja executar ${cleanupType}? Esta ação é IRREVERSÍVEL!`)) {
      return;
    }

    setLoading(true);
    
    try {
      console.log('Executing system cleanup:', { cleanupType, keepAdmin });
      
      const { data, error } = await supabase.rpc('system_cleanup', {
        cleanup_type: cleanupType,
        target_tables: null,
        keep_admin: keepAdmin
      });

      console.log('Cleanup result:', { data, error });

      if (error) {
        console.error('Cleanup error:', error);
        
        // Tratamento de erros específicos
        let errorMessage = "Falha ao executar limpeza do sistema";
        if (error.message.includes('WHERE clause')) {
          errorMessage = "Erro interno: Cláusula WHERE necessária. Contate o administrador.";
        } else if (error.message.includes('permission')) {
          errorMessage = "Permissão insuficiente para executar esta operação";
        } else if (error.message.includes('admin')) {
          errorMessage = "Apenas administradores podem executar limpeza do sistema";
        }
        
        toast({
          title: "Erro na Limpeza",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
      
      // Conversão segura do resultado
      let cleanupResult: CleanupResult;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const cleanupData = data as Record<string, any>;
        cleanupResult = {
          success: Boolean(cleanupData.success),
          records_deleted: Number(cleanupData.records_deleted) || 0,
          cleanup_type: String(cleanupData.cleanup_type) || cleanupType
        };
      } else {
        cleanupResult = {
          success: true,
          records_deleted: 0,
          cleanup_type: cleanupType
        };
      }

      toast({
        title: "Limpeza Executada com Sucesso",
        description: `${cleanupResult.records_deleted} registros foram removidos. Tipo: ${cleanupResult.cleanup_type}`,
      });
      
      // Reset do formulário
      setConfirmText("");
      
    } catch (error) {
      console.error('System cleanup failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro Crítico na Limpeza",
        description: `Falha inesperada: ${errorMessage}. Verifique os logs do sistema.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
        <CardHeader>
          <CardTitle className="text-futuristic-primary">Configurações de Segurança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="keep_admin"
              checked={keepAdmin}
              onCheckedChange={(checked) => setKeepAdmin(checked as boolean)}
            />
            <Label htmlFor="keep_admin">
              Manter conta do administrador atual (ALTAMENTE RECOMENDADO)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_text" className="text-red-500 font-bold">
              Digite exatamente "DELETAR TUDO" para habilitar as operações:
            </Label>
            <Input
              id="confirm_text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETAR TUDO"
              className={`border-red-500 focus:border-red-600 ${
                isConfirmationValid ? 'bg-green-50 border-green-500' : ''
              }`}
            />
            {isConfirmationValid && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                ✓ Operações de limpeza habilitadas
              </p>
            )}
            {confirmText && !isConfirmationValid && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                ✗ Texto de confirmação incorreto
              </p>
            )}
          </div>

          <div className="p-4 bg-red-50/10 border border-red-500/20 rounded-lg">
            <h4 className="text-red-500 font-bold mb-2">⚠️ AVISOS IMPORTANTES:</h4>
            <ul className="text-sm text-red-400 space-y-1">
              <li>• Backup automático será criado antes da limpeza</li>
              <li>• Todas as ações são registradas nos logs do sistema</li>
              <li>• É OBRIGATÓRIO fazer backup manual antes de operações críticas</li>
              <li>• O sistema pode demorar alguns minutos para processar limpezas grandes</li>
              <li>• Digite exatamente "DELETAR TUDO" (sem aspas) para habilitar</li>
              <li>• Operações só funcionam com permissões de administrador</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {cleanupOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Card key={option.id} className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${option.color}`} />
                    <div>
                      <CardTitle className={option.color}>{option.label}</CardTitle>
                      <CardDescription>{option.description}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => executeCleanup(option.id)}
                    disabled={loading || !isConfirmationValid}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {loading ? 'Executando...' : 'Executar'}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
