import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';

export const useProfileRealtime = (userId: string | undefined) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }
      
      console.log('Profile fetched:', data);
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    if (!userId) return;

    // Configurar real-time updates para o perfil
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
          console.log('Profile update received:', payload);
          if (payload.eventType === 'UPDATE' && payload.new) {
            console.log('Updating profile with new data:', payload.new);
            setProfile(payload.new as Profile);
          }
        }
      )
      .subscribe((status) => {
        console.log('Profile channel subscription status:', status);
      });

    return () => {
      console.log('Removing profile channel');
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const updateProfile = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
  };

  return { profile, loading, updateProfile, refetch: fetchProfile };
};