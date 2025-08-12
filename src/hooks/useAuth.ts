import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useErrorHandler } from './useErrorHandler';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true
  });
  const { handleAsyncError } = useErrorHandler();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false
        });
      }
    );

    // THEN check for existing session
    const getInitialSession = async () => {
      await handleAsyncError(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Initial session:', session?.user?.id);
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false
        });
      }, {
        title: "Erro ao verificar sessão",
        showToast: false
      });
    };

    getInitialSession();

    return () => subscription.unsubscribe();
  }, [handleAsyncError]);

  const signOut = async () => {
    await handleAsyncError(async () => {
      await supabase.auth.signOut();
    }, {
      title: "Erro ao sair",
      showToast: true
    });
  };

  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    isAuthenticated: !!authState.user,
    signOut
  };
};