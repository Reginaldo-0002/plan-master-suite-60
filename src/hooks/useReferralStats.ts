import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ReferralStats {
  total_referrals: number;
  referral_earnings: number;
}

export const useReferralStats = () => {
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    total_referrals: 0,
    referral_earnings: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchReferralStats = async () => {
    if (!user) return;

    try {
      // Buscar total de indicações
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id);

      if (referralsError) throw referralsError;

      // Buscar ganhos de indicação do perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('referral_earnings')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      setReferralStats({
        total_referrals: referralsData?.length || 0,
        referral_earnings: Number(profileData?.referral_earnings || 0)
      });

      console.log('💰 Referral stats loaded:', {
        total_referrals: referralsData?.length || 0,
        referral_earnings: Number(profileData?.referral_earnings || 0)
      });
    } catch (error) {
      console.error('❌ Error fetching referral stats:', error);
      setReferralStats({
        total_referrals: 0,
        referral_earnings: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralStats();
    
    // Set up real-time listener for referrals
    const referralsChannel = supabase
      .channel('referrals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referrals',
          filter: `referrer_id=eq.${user?.id}`
        },
        () => {
          console.log('💰 Referral changed, refetching stats...');
          fetchReferralStats();
        }
      )
      .subscribe();

    // Set up real-time listener for profile changes (earnings)
    const profileChannel = supabase
      .channel('profile-earnings-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          console.log('💰 Profile earnings changed, refetching stats...');
          fetchReferralStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(referralsChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [user]);

  return { referralStats, loading, refetch: fetchReferralStats };
};