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
      const { data, error } = await supabase.rpc('get_user_time_stats', {
        target_user_id: targetUserId || user.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setTimeStats(data[0]);
      }
    } catch (error) {
      console.error('Error fetching time stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeStats();
  }, [user, targetUserId]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return { timeStats, loading, formatTime, refetch: fetchTimeStats };
};