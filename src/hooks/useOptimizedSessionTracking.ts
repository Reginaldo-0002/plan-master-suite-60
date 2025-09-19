import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useOptimizedSessionTracking = () => {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) {
      // Cleanup if user doesn't exist
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      sessionIdRef.current = null;
      startTimeRef.current = null;
      return;
    }

    // Avoid multiple sessions for the same user
    if (sessionIdRef.current) {
      return;
    }

    const startSession = async () => {
      try {
        // Get user IP with fallback
        let userIP = '127.0.0.1';
        try {
          const response = await fetch('https://api.ipify.org?format=json', { 
            signal: AbortSignal.timeout(3000) 
          });
          const data = await response.json();
          userIP = data.ip || '127.0.0.1';
        } catch {
          console.log('Using fallback IP address');
        }

        // Create new session with error handling
        const { data: sessionData, error } = await supabase
          .from('user_sessions')
          .insert({
            user_id: user.id,
            ip_address: userIP,
            user_agent: navigator.userAgent || 'Unknown',
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
        
        console.log('✅ Session created:', sessionData.id);

        // Update session every 2 minutes
        intervalRef.current = setInterval(async () => {
          if (sessionIdRef.current && startTimeRef.current) {
            const duration = Math.floor((Date.now() - startTimeRef.current.getTime()) / (1000 * 60));
            
            try {
              await supabase
                .from('user_sessions')
                .update({ duration_minutes: duration })
                .eq('id', sessionIdRef.current);
            } catch (error) {
              console.error('Error updating session:', error);
            }
          }
        }, 2 * 60 * 1000);

        // Handle page close
        const handleBeforeUnload = () => {
          if (sessionIdRef.current && startTimeRef.current) {
            const duration = Math.floor((Date.now() - startTimeRef.current.getTime()) / (1000 * 60));
            
            // Use keepalive for reliable session ending
            fetch(`https://srnwogrjwhqjjyodxalx.supabase.co/rest/v1/user_sessions?id=eq.${sessionIdRef.current}`, {
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
            }).catch(() => {});
          }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
        };

      } catch (error) {
        console.error('Session tracking error:', error);
      }
    };

    startSession();

    // Cleanup on user change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      const finalizeSession = async () => {
        if (sessionIdRef.current && startTimeRef.current) {
          const duration = Math.floor((Date.now() - startTimeRef.current.getTime()) / (1000 * 60));
          
          try {
            await supabase
              .from('user_sessions')
              .update({
                session_end: new Date().toISOString(),
                duration_minutes: duration,
                is_active: false
              })
              .eq('id', sessionIdRef.current);
            
            sessionIdRef.current = null;
            startTimeRef.current = null;
          } catch (error) {
            console.error('Error ending session:', error);
          }
        }
      };

      finalizeSession();
    };
  }, [user?.id]); // Only depend on user.id for stability

  return null;
};
