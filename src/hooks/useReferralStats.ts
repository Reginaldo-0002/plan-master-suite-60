import { useState, useEffect, useCallback } from 'react';
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

  const fetchReferralStats = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Buscar total de indicações usando Promise.all para melhor performance
      const [referralsResult, profileResult] = await Promise.all([
        supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', user.id),
        supabase
          .from('profiles')
          .select('referral_earnings')
          .eq('user_id', user.id)
          .single()
      ]);

      if (referralsResult.error) {
        console.error('❌ Error fetching referrals:', referralsResult.error);
      }

      if (profileResult.error) {
        console.error('❌ Error fetching profile:', profileResult.error);
      }

      const stats = {
        total_referrals: referralsResult.data?.length || 0,
        referral_earnings: Number(profileResult.data?.referral_earnings || 0)
      };

      setReferralStats(stats);

      console.log('💰 Referral stats loaded:', stats);
    } catch (error) {
      console.error('❌ Error fetching referral stats:', error);
      setReferralStats({
        total_referrals: 0,
        referral_earnings: 0
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReferralStats();
    
    if (!user) return;

    // Set up real-time listener for referrals
    const referralsChannel = supabase
      .channel(`referrals-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referrals',
          filter: `referrer_id=eq.${user.id}`
        },
        (payload) => {
          console.log('💰 Referral changed:', payload);
          fetchReferralStats();
        }
      )
      .subscribe();

    // Set up real-time listener for profile changes (earnings)
    const profileChannel = supabase
      .channel(`profile-earnings-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('💰 Profile earnings changed:', payload);
          fetchReferralStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(referralsChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [fetchReferralStats, user]);

  return { referralStats, loading, refetch: fetchReferralStats };
};