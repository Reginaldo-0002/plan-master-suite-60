import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TimeStats {
  today_minutes: number;
  week_minutes: number;
  month_minutes: number;
  year_minutes: number;
}

export const useTimeStats = (targetUserId?: string) => {
  const [timeStats, setTimeStats] = useState<TimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTimeStats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_time_stats', {
        target_user_id: targetUserId || user.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setTimeStats(data[0]);
        console.log('⏰ Time stats loaded:', data[0]);
      } else {
        // Set zero stats if no data
        setTimeStats({
          today_minutes: 0,
          week_minutes: 0,
          month_minutes: 0,
          year_minutes: 0
        });
      }
    } catch (error) {
      console.error('❌ Error fetching time stats:', error);
      setTimeStats({
        today_minutes: 0,
        week_minutes: 0,
        month_minutes: 0,
        year_minutes: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeStats();
    
    // Set up real-time listener for time session updates
    const channel = supabase
      .channel('user-time-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_time_sessions',
          filter: `user_id=eq.${targetUserId || user?.id}`
        },
        () => {
          console.log('⏰ Time session changed, refetching stats...');
          fetchTimeStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, targetUserId]);

  const formatTime = (minutes: number) => {
    if (!minutes || minutes === 0) return '0m';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return { timeStats, loading, formatTime, refetch: fetchTimeStats };
};