
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CleanupResult {
  success: boolean;
  records_deleted: number;
  cleanup_type: string;
  keep_admin: boolean;
  executed_by: string;
  timestamp: string;
}

interface CleanupError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

export const useCleanupLogic = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const { toast } = useToast();

  const validateCleanupParams = (cleanupType: string): boolean => {
    const validTypes = ['users', 'content', 'logs', 'all'];
    
    if (!cleanupType || cleanupType.trim() === '') {
      toast({
        title: "Erro de Validação",
        description: "Tipo de limpeza não pode ser vazio",
        variant: "destructive",
      });
      return false;
    }

    if (!validTypes.includes(cleanupType)) {
      toast({
        title: "Erro de Validação",
        description: `Tipo de limpeza "${cleanupType}" não é válido. Tipos válidos: ${validTypes.join(', ')}`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const executeCleanup = async (cleanupType: string, keepAdmin: boolean): Promise<boolean> => {
    // Validação prévia
    if (!validateCleanupParams(cleanupType)) {
      return false;
    }

    setLoading(true);
    setProgress('Validando permissões...');
    
    try {
      // Verificar se o usuário tem permissões de admin antes de prosseguir
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        toast({
          title: "Acesso Negado",
          description: "Apenas administradores podem executar limpeza do sistema",
          variant: "destructive",
        });
        return false;
      }

      setProgress('Iniciando limpeza do sistema...');
      
      console.log('Executing system cleanup:', { 
        cleanupType, 
        keepAdmin,
        timestamp: new Date().toISOString(),
        validationPassed: true
      });
      
      const { data, error } = await supabase.rpc('system_cleanup', {
        cleanup_type: cleanupType,
        target_tables: null,
        keep_admin: keepAdmin
      });

      console.log('Cleanup result:', { data, error });

      if (error) {
        return handleCleanupError(error as CleanupError, cleanupType);
      }
      
      // Validação e conversão segura do resultado
      let cleanupResult: CleanupResult;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const cleanupData = data as Record<string, any>;
        cleanupResult = {
          success: Boolean(cleanupData.success),
          records_deleted: Number(cleanupData.records_deleted) || 0,
          cleanup_type: String(cleanupData.cleanup_type) || cleanupType,
          keep_admin: Boolean(cleanupData.keep_admin),
          executed_by: String(cleanupData.executed_by) || '',
          timestamp: String(cleanupData.timestamp) || new Date().toISOString()
        };
      } else {
        cleanupResult = {
          success: true,
          records_deleted: 0,
          cleanup_type: cleanupType,
          keep_admin: keepAdmin,
          executed_by: '',
          timestamp: new Date().toISOString()
        };
      }

      setProgress('Limpeza concluída com sucesso!');

      // Toast de sucesso com informações detalhadas
      toast({
        title: "Limpeza Executada com Sucesso",
        description: `${cleanupResult.records_deleted} registros foram removidos. Tipo: ${cleanupResult.cleanup_type}${keepAdmin ? ' (Admin preservado)' : ''}`,
      });
      
      // Log de auditoria detalhado
      console.log('System cleanup completed successfully:', {
        ...cleanupResult,
        operation: 'system_cleanup',
        status: 'success'
      });
      
      return true;
      
    } catch (error) {
      return handleUnexpectedError(error, cleanupType, keepAdmin);
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const handleCleanupError = (error: CleanupError, cleanupType: string): boolean => {
    console.error('Cleanup error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      cleanupType,
      timestamp: new Date().toISOString()
    });
    
    let errorMessage = "Falha ao executar limpeza do sistema";
    let errorTitle = "Erro na Limpeza";
    
    // Tratamento específico por código de erro
    switch (error.code) {
      case '21000':
        errorTitle = "Erro de Sintaxe SQL";
        errorMessage = "Erro na estrutura do comando SQL. O sistema foi corrigido, tente novamente.";
        break;
      case '42702':
        errorTitle = "Erro de Configuração";
        errorMessage = "Erro de configuração do sistema. Contate o administrador técnico.";
        break;
      case '23503':
        errorTitle = "Erro de Dependência";
        errorMessage = "Não é possível remover registros devido a dependências. Tente uma limpeza mais específica.";
        break;
      case '42501':
        errorTitle = "Permissão Insuficiente";
        errorMessage = "Permissão insuficiente para executar esta operação";
        break;
      default:
        if (error.message?.includes('permission')) {
          errorTitle = "Erro de Permissão";
          errorMessage = "Permissão insuficiente para executar esta operação";
        } else if (error.message?.includes('admin')) {
          errorTitle = "Acesso Restrito";
          errorMessage = "Apenas administradores podem executar limpeza do sistema";
        } else if (error.message?.includes('não suportado')) {
          errorTitle = "Tipo Inválido";
          errorMessage = `Tipo de limpeza "${cleanupType}" não é suportado`;
        } else if (error.message) {
          errorMessage = error.message;
        }
    }
    
    toast({
      title: errorTitle,
      description: errorMessage,
      variant: "destructive",
    });
    
    return false;
  };

  const handleUnexpectedError = (error: unknown, cleanupType: string, keepAdmin: boolean): boolean => {
    console.error('System cleanup failed - Unexpected error:', {
      error,
      cleanupType,
      keepAdmin,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    toast({
      title: "Erro Crítico na Limpeza",
      description: `Falha inesperada: ${errorMessage}. Verifique os logs do sistema e tente novamente.`,
      variant: "destructive",
    });
    
    return false;
  };

  return { 
    executeCleanup, 
    loading, 
    progress 
  };
};
