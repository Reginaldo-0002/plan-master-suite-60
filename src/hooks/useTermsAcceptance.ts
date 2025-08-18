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
        // Primeiro, tenta usar cache local para evitar flicker
        const cacheKey = `termsAccepted:${user.id}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached === 'true') {
          setHasAcceptedTerms(true);
        }

        // Fallback robusto: consultar diretamente a tabela (evita depender de RPC inexistente)
        const { data, error } = await supabase
          .from('terms_acceptance')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        
        if (error) {
          console.error('Erro ao verificar aceitação de termos (select):', error);
          // Mantém estado do cache, se houver; caso contrário, assume false
          setHasAcceptedTerms((prev) => (prev !== null ? prev : false));
        } else {
          const accepted = !!data;
          setHasAcceptedTerms(accepted);
          if (accepted) localStorage.setItem(cacheKey, 'true');
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
            console.log('Terms acceptance INSERT received:', payload);
            setHasAcceptedTerms(true);
            localStorage.setItem(`termsAccepted:${user.id}`, 'true');
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'terms_acceptance',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Terms acceptance UPDATE received:', payload);
            setHasAcceptedTerms(true);
            localStorage.setItem(`termsAccepted:${user.id}`, 'true');
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
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('duplicate') || msg.includes('unique')) {
          localStorage.setItem(`termsAccepted:${user.id}`, 'true');
          setHasAcceptedTerms(true);
          return true;
        }
        console.error('Erro ao aceitar termos:', error);
        return false;
      }
      localStorage.setItem(`termsAccepted:${user.id}`, 'true');
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