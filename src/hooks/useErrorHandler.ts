
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ErrorHandlerOptions {
  title?: string;
  showToast?: boolean;
  logError?: boolean;
}

export const useErrorHandler = () => {
  const { toast } = useToast();

  const handleError = useCallback((
    error: Error | unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      title = 'Erro',
      showToast = true,
      logError = true
    } = options;

    // Log do erro para debugging
    if (logError) {
      console.error('Error handled:', error);
    }

    // Determinar mensagem de erro
    let message = 'Ocorreu um erro inesperado';
    
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = String((error as any).message);
    }

    // Mostrar toast se solicitado
    if (showToast) {
      toast({
        title,
        description: message,
        variant: 'destructive',
      });
    }

    return message;
  }, [toast]);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, options);
      return null;
    }
  }, [handleError]);

  return { handleError, handleAsyncError };
};
