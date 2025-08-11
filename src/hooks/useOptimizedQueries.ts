import { useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useOptimizedQueries = () => {
  const { toast } = useToast();

  const memoizedToast = useCallback((title: string, description: string, variant?: 'default' | 'destructive') => {
    toast({
      title,
      description,
      variant,
    });
  }, [toast]);

  const fetchWithErrorHandling = useCallback(async <T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    errorMessage: string
  ): Promise<T | null> => {
    try {
      const { data, error } = await queryFn();
      
      if (error) {
        console.error('Query error:', error);
        memoizedToast('Erro', errorMessage, 'destructive');
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Unexpected error:', error);
      memoizedToast('Erro', 'Erro inesperado', 'destructive');
      return null;
    }
  }, [memoizedToast]);

  const optimizedUserFetch = useCallback(async () => {
    return fetchWithErrorHandling(
      async () => {
        const result = await supabase.auth.getUser();
        return { data: result.data, error: result.error };
      },
      'Erro ao verificar autenticação'
    );
  }, [fetchWithErrorHandling]);

  const optimizedProfileFetch = useCallback(async (userId: string) => {
    return fetchWithErrorHandling(
      async () => {
        const result = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        return { data: result.data, error: result.error };
      },
      'Erro ao carregar perfil'
    );
  }, [fetchWithErrorHandling]);

  const optimizedRulesFetch = useCallback(async () => {
    return fetchWithErrorHandling(
      async () => {
        const result = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'site_rules')
          .single();
        return { data: result.data, error: result.error };
      },
      'Erro ao carregar regras'
    );
  }, [fetchWithErrorHandling]);

  return {
    optimizedUserFetch,
    optimizedProfileFetch,
    optimizedRulesFetch,
    fetchWithErrorHandling,
    memoizedToast
  };
};