import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserStats {
  areas_accessed: number;
  total_referrals: number;
}

export const useUserStats = () => {
  const [stats, setStats] = useState<UserStats>({ areas_accessed: 0, total_referrals: 0 });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Buscar áreas acessadas únicas
      const { data: areasData, error: areasError } = await supabase
        .from('user_area_tracking')
        .select('area_name')
        .eq('user_id', user.id);

      if (areasError) throw areasError;

      const uniqueAreas = new Set(areasData?.map(item => item.area_name) || []);

      // Buscar referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', user.id);

      if (referralsError) throw referralsError;

      const newStats = {
        areas_accessed: uniqueAreas.size,
        total_referrals: referralsData?.length || 0
      };

      setStats(newStats);
      console.log('📊 User stats updated:', newStats);
    } catch (error) {
      console.error('❌ Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Subscrever mudanças em tempo real nas áreas acessadas
    const areaChannel = supabase
      .channel('user-area-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_area_tracking',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          console.log('📍 Area tracking changed, refetching stats...');
          fetchStats();
        }
      )
      .subscribe();

    // Subscrever mudanças em tempo real nos referrals
    const referralChannel = supabase
      .channel('user-referral-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referrals',
          filter: `referrer_id=eq.${user?.id}`
        },
        () => {
          console.log('👥 Referral changed, refetching stats...');
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(areaChannel);
      supabase.removeChannel(referralChannel);
    };
  }, [user]);

  return { stats, loading, refetch: fetchStats };
};