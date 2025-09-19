import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useOptimizedTimeTracking = () => {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!user) {
      // Cleanup if no user
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      startTimeRef.current = null;
      return;
    }

    // Start time tracking
    startTimeRef.current = new Date();
    console.log('⏰ Starting time tracking for user:', user.id);

    // Track time every 5 minutes with error handling
    intervalRef.current = setInterval(async () => {
      try {
        const { error } = await supabase.rpc('add_session_time', {
          minutes_to_add: 5
        });
        
        if (error) {
          console.error('❌ Error adding session time:', error);
        } else {
          console.log('✅ Session time tracked: +5 minutes');
        }
      } catch (error) {
        console.error('❌ Time tracking error:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Track final session time
      if (startTimeRef.current) {
        const sessionDuration = Math.floor(
          (new Date().getTime() - startTimeRef.current.getTime()) / (1000 * 60)
        );
        
        if (sessionDuration > 0) {
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
      
      startTimeRef.current = null;
      console.log('⏰ Time tracking stopped');
    };
  }, [user?.id]); // Only depend on user.id for stability

  return null;
};