import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useSessionTracking = () => {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) {
      // Cleanup se usuário não existe
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Evitar múltiplas sessões para o mesmo usuário
    if (sessionIdRef.current) {
      console.log('Session already active for user:', user.id);
      return;
    }

    console.log('Starting session tracking for user:', user.id);

    const startSession = async () => {
      try {
        // Obter IP do usuário
        let userIP = '127.0.0.1'; // fallback
        try {
          const response = await fetch('https://api.ipify.org?format=json');
          const data = await response.json();
          userIP = data.ip;
        } catch (ipError) {
          console.warn('Could not get external IP, using fallback');
        }

        // Verificar limite de IPs
        const { data: checkResult } = await supabase.rpc('check_ip_limit', {
          target_user_id: user.id,
          current_ip: userIP
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
            ip_address: userIP,
            user_agent: navigator.userAgent,
            session_start: new Date().toISOString(),
            is_active: true,
            duration_minutes: 0
          })
          .select('id')
          .single();

        if (error) {
          console.error('Error creating session:', error);
          return;
        }

        sessionIdRef.current = sessionData.id;
        startTimeRef.current = new Date();
        
        console.log('Session created successfully:', sessionData.id);

        // Atualizar atividade a cada 2 minutos para capturar melhor
        intervalRef.current = setInterval(() => {
          if (sessionIdRef.current && startTimeRef.current) {
            const duration = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000 / 60);
            console.log('Updating session duration:', duration, 'minutes');
            supabase
              .from('user_sessions')
              .update({ duration_minutes: duration })
              .eq('id', sessionIdRef.current)
              .then((result) => {
                if (result.error) {
                  console.error('Error updating session:', result.error);
                } else {
                  console.log('Session activity updated successfully');
                }
              });
          }
        }, 2 * 60 * 1000); // 2 minutos

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
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          window.removeEventListener('beforeunload', handleBeforeUnload);
        };

      } catch (error) {
        console.error('Error in session tracking:', error);
        // Ainda assim tenta criar uma sessão básica
        try {
          await supabase
            .from('user_sessions')
            .insert({
              user_id: user.id,
              ip_address: '127.0.0.1',
              user_agent: navigator.userAgent || 'Unknown',
              session_start: new Date().toISOString(),
              is_active: true,
              duration_minutes: 0
            });
          console.log('Fallback session created');
        } catch (fallbackError) {
          console.error('Failed to create fallback session:', fallbackError);
        }
      }
    };

    startSession();

    // Cleanup quando usuário faz logout
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
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
            sessionIdRef.current = null;
            startTimeRef.current = null;
          });
      }
    };
  }, [user]);
};