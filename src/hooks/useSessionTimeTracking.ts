import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useSessionTimeTracking = () => {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!user) return;

    // Start tracking when user is authenticated
    startTimeRef.current = new Date();
    console.log('⏰ Starting session time tracking for user:', user.id);

    // Set up interval to track time every 5 minutes (mais realista)
    intervalRef.current = setInterval(async () => {
      try {
        const { error } = await supabase.rpc('add_session_time', {
          minutes_to_add: 5 // Adiciona 5 minutos a cada 5 minutos reais
        });
        
        if (error) {
          console.error('❌ Error adding session time:', error);
        } else {
          console.log('✅ Session time tracked: +5 minutes');
        }
      } catch (error) {
        console.error('❌ Error adding session time:', error);
      }
    }, 300000); // Every 5 minutes (300000ms)

    // Cleanup on unmount or user change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      if (startTimeRef.current) {
        const sessionDuration = Math.floor(
          (new Date().getTime() - startTimeRef.current.getTime()) / (1000 * 60)
        );
        
        if (sessionDuration > 0) {
          // Track final session time on cleanup
          supabase.rpc('add_session_time', {
            minutes_to_add: sessionDuration
          }).then(({ error }) => {
            if (error) {
              console.error('❌ Error tracking final session time:', error);
            } else {
              console.log(`✅ Final session time tracked: +${sessionDuration} minutes`);
            }
          });
        }
      }
      
      console.log('⏰ Session time tracking stopped');
    };
  }, [user]);

  return null; // This hook doesn't return anything, just tracks time
};