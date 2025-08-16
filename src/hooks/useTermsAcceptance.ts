import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useTermsAcceptance = () => {
  const { user, loading: authLoading } = useAuth();
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTermsAcceptance = async () => {
      if (!user || authLoading) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_accepted_terms');
        
        if (error) {
          console.error('Erro ao verificar aceitação de termos:', error);
          setHasAcceptedTerms(false);
        } else {
          setHasAcceptedTerms(data || false);
        }
      } catch (error) {
        console.error('Erro ao verificar aceitação de termos:', error);
        setHasAcceptedTerms(false);
      } finally {
        setLoading(false);
      }
    };

    checkTermsAcceptance();

    // Configurar listener de realtime para atualizações de aceitação de termos
    if (user) {
      const channel = supabase
        .channel('terms_acceptance_updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'terms_acceptance',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Terms acceptance update received:', payload);
            setHasAcceptedTerms(true);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, authLoading]);

  const acceptTerms = async () => {
    if (!user) return false;

    try {
      // Obter IP do usuário
      let userIP = 'IP não disponível';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        userIP = ipData.ip;
      } catch (ipError) {
        console.error('Erro ao obter IP:', ipError);
      }

      const { error } = await supabase
        .from('terms_acceptance')
        .insert({
          user_id: user.id,
          ip_address: userIP,
          user_agent: navigator.userAgent,
        });

      if (error) {
        console.error('Erro ao aceitar termos:', error);
        return false;
      }

      setHasAcceptedTerms(true);
      return true;
    } catch (error) {
      console.error('Erro ao aceitar termos:', error);
      return false;
    }
  };

  return {
    hasAcceptedTerms,
    loading: loading || authLoading,
    acceptTerms,
  };
};