import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useSessionTracking = () => {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!user) return;

    const startSession = async () => {
      try {
        // Obter IP do usuário (aproximado)
        const response = await fetch('https://api.ipify.org?format=json');
        const { ip } = await response.json();

        // Verificar limite de IPs
        const { data: checkResult } = await supabase.rpc('check_ip_limit', {
          target_user_id: user.id,
          current_ip: ip
        });

        if (checkResult && typeof checkResult === 'object' && 'allowed' in checkResult && !checkResult.allowed) {
          // Usuário foi bloqueado
          await supabase.auth.signOut();
          window.location.href = '/auth';
          return;
        }

        // Criar nova sessão
        const { data: sessionData, error } = await supabase
          .from('user_sessions')
          .insert({
            user_id: user.id,
            ip_address: ip,
            user_agent: navigator.userAgent,
            session_start: new Date().toISOString(),
            is_active: true
          })
          .select('id')
          .single();

        if (error) {
          console.error('Error creating session:', error);
          return;
        }

        sessionIdRef.current = sessionData.id;
        startTimeRef.current = new Date();

        // Atualizar atividade a cada 5 minutos
        const activityInterval = setInterval(() => {
          if (sessionIdRef.current && startTimeRef.current) {
            const duration = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000 / 60);
            supabase
              .from('user_sessions')
              .update({ duration_minutes: duration })
              .eq('id', sessionIdRef.current)
              .then(() => {
                console.log('Session activity updated');
              });
          }
        }, 5 * 60 * 1000); // 5 minutos

        // Finalizar sessão quando sair
        const handleBeforeUnload = () => {
          if (sessionIdRef.current && startTimeRef.current) {
            const duration = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000 / 60);
            // Usar fetch com keepalive em vez de sendBeacon para melhor compatibilidade
            fetch('https://srnwogrjwhqjjyodxalx.supabase.co/rest/v1/user_sessions', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNybndvZ3Jqd2hxamp5b2R4YWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NzY0NDIsImV4cCI6MjA3MDQ1MjQ0Mn0.MGvm-0S7W6NPtav5Gu2IbBwCvrs7VbcV04Py5eq66xc',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                session_end: new Date().toISOString(),
                duration_minutes: duration,
                is_active: false
              }),
              keepalive: true
            }).catch(console.error);
          }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
          clearInterval(activityInterval);
          window.removeEventListener('beforeunload', handleBeforeUnload);
        };

      } catch (error) {
        console.error('Error in session tracking:', error);
      }
    };

    startSession();

    // Cleanup quando usuário faz logout
    return () => {
      if (sessionIdRef.current && startTimeRef.current) {
        const duration = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000 / 60);
        supabase
          .from('user_sessions')
          .update({
            session_end: new Date().toISOString(),
            duration_minutes: duration,
            is_active: false
          })
          .eq('id', sessionIdRef.current)
          .then(() => {
            console.log('Session ended');
          });
      }
    };
  }, [user]);
};