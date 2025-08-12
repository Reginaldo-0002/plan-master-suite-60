import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';

export const useProfileRealtime = (userId: string | undefined) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      console.log('👤 Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching profile:', error);
        throw error;
      }
      
      console.log('✅ Profile fetched:', data);
      setProfile(data);
    } catch (error) {
      console.error('💥 Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();

    if (!userId) return;

    // Real-time subscription para mudanças no perfil
    const channel = supabase
      .channel(`profile-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔄 Profile update received:', payload);
          if (payload.eventType === 'UPDATE' && payload.new) {
            console.log('✨ Updating profile with new data:', payload.new);
            setProfile(payload.new as Profile);
          } else {
            // Se não recebeu os dados corretos, refetch
            console.log('🔄 Refetching profile data...');
            setTimeout(fetchProfile, 500);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Profile channel subscription status:', status);
      });

    // Polling como backup (verifica a cada 30 segundos)
    const interval = setInterval(() => {
      console.log('⏰ Periodic profile check');
      fetchProfile();
    }, 30000);

    return () => {
      console.log('🧹 Cleaning up profile listeners');
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [userId, fetchProfile]);

  const updateProfile = useCallback((updatedProfile: Profile) => {
    console.log('📝 Manual profile update:', updatedProfile);
    setProfile(updatedProfile);
  }, []);

  return { profile, loading, updateProfile, refetch: fetchProfile };
};