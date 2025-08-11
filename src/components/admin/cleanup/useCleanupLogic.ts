
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CleanupResult {
  success: boolean;
  records_deleted: number;
  cleanup_type: string;
}

export const useCleanupLogic = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const executeCleanup = async (cleanupType: string, keepAdmin: boolean): Promise<boolean> => {
    setLoading(true);
    
    try {
      console.log('Executing system cleanup:', { 
        cleanupType, 
        keepAdmin,
        timestamp: new Date().toISOString()
      });
      
      // Usar os nomes corretos dos parâmetros da função SQL
      const { data, error } = await supabase.rpc('system_cleanup', {
        cleanup_type: cleanupType,
        target_tables: null,
        keep_admin: keepAdmin
      });

      console.log('Cleanup result:', { data, error });

      if (error) {
        console.error('Cleanup error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Tratamento de erros mais específico
        let errorMessage = "Falha ao executar limpeza do sistema";
        
        if (error.code === '42702') {
          errorMessage = "Erro de configuração do sistema. Contate o administrador técnico.";
        } else if (error.message?.includes('permission')) {
          errorMessage = "Permissão insuficiente para executar esta operação";
        } else if (error.message?.includes('admin')) {
          errorMessage = "Apenas administradores podem executar limpeza do sistema";
        } else if (error.message?.includes('não suportado')) {
          errorMessage = `Tipo de limpeza "${cleanupType}" não é suportado`;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast({
          title: "Erro na Limpeza",
          description: errorMessage,
          variant: "destructive",
        });
        return false;
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
      
      return true;
      
    } catch (error) {
      console.error('System cleanup failed - Unexpected error:', {
        error,
        cleanupType,
        keepAdmin,
        timestamp: new Date().toISOString()
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro Crítico na Limpeza",
        description: `Falha inesperada: ${errorMessage}. Verifique os logs do sistema.`,
        variant: "destructive",
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { executeCleanup, loading };
};
