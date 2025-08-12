import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';
import { useToast } from '@/hooks/use-toast';

export const useProfileData = (userId?: string) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchProfile();
    setupRealtimeSubscription();
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);
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

      // Get the actual role from user_roles table
      const { data: roleData, error: roleError } = await supabase.rpc('get_current_user_role');
      
      if (!roleError && roleData) {
        data.role = roleData;
      }

      console.log('Profile loaded with real-time:', data);
      setProfile(data);
    } catch (error) {
      console.error('Profile fetch error:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar perfil do usuário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!userId) return;

    console.log('Setting up real-time subscription for profile:', userId);

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Profile real-time update:', payload);
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            setProfile(prev => prev ? { ...prev, ...payload.new } : payload.new as Profile);
            
            toast({
              title: "Perfil Atualizado",
              description: "Suas informações foram atualizadas automaticamente",
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('User role real-time update:', payload);
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            // Refresh the complete profile when role changes
            await fetchProfile();
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up profile subscription');
      supabase.removeChannel(channel);
    };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId || !profile) return null;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      console.log('Profile updated:', data);
      setProfile(data);
      
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });

      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil. Tente novamente.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    loading,
    updateProfile,
    refreshProfile: fetchProfile
  };
};