import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useTermsAcceptance = () => {
  const { user, loading: authLoading } = useAuth();
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const checkedRef = useRef(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const checkTermsAcceptance = async () => {
      if (!user || authLoading || checkedRef.current) {
        setLoading(false);
        return;
      }

      checkedRef.current = true;

      try {
        // Cache otimizado para evitar queries desnecessárias
        const cacheKey = `termsAccepted:${user.id}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached === 'true') {
          setHasAcceptedTerms(true);
          setLoading(false);
          return; // Para aqui se já tem no cache
        }

        // Query única com maybeSingle() - muito mais eficiente
        const { data, error } = await supabase
          .from('terms_acceptance')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Erro ao verificar termos:', error);
          setHasAcceptedTerms(false);
        } else {
          const accepted = !!data;
          setHasAcceptedTerms(accepted);
          if (accepted) {
            localStorage.setItem(cacheKey, 'true');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar aceitação de termos:', error);
        setHasAcceptedTerms(false);
      } finally {
        setLoading(false);
      }
    };

    checkTermsAcceptance();

    // Real-time listener otimizado - apenas 1 canal por usuário
    if (user && !channelRef.current) {
      channelRef.current = supabase
        .channel(`terms_user_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Escuta qualquer mudança
            schema: 'public',
            table: 'terms_acceptance',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            setHasAcceptedTerms(true);
            localStorage.setItem(`termsAccepted:${user.id}`, 'true');
          }
        )
        .subscribe();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
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