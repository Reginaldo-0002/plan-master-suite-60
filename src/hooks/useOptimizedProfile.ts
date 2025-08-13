import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/types/profile';

interface ProfileCache {
  data: Profile | null;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const profileCache = new Map<string, ProfileCache>();

export const useOptimizedProfile = (userId?: string) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Verificar cache
  const getCachedProfile = useCallback((id: string): Profile | null => {
    const cached = profileCache.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, []);

  // Salvar no cache
  const setCachedProfile = useCallback((id: string, data: Profile | null) => {
    profileCache.set(id, {
      data,
      timestamp: Date.now()
    });
  }, []);

  const fetchProfile = useCallback(async (id: string) => {
    try {
      setError(null);
      
      // Verificar cache primeiro
      const cached = getCachedProfile(id);
      if (cached) {
        setProfile(cached);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Perfil não existe, criar um novo
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: id,
              plan: 'free',
              role: 'user'
            })
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          setProfile(newProfile);
          setCachedProfile(id, newProfile);
        } else {
          throw error;
        }
      } else {
        setProfile(data);
        setCachedProfile(id, data);
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Erro ao carregar perfil');
      toast({
        title: "Erro",
        description: "Erro ao carregar perfil do usuário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [getCachedProfile, setCachedProfile, toast]);

  const updateProfile = useCallback((updatedProfile: Profile) => {
    setProfile(updatedProfile);
    if (userId) {
      setCachedProfile(userId, updatedProfile);
    }
  }, [userId, setCachedProfile]);

  useEffect(() => {
    if (userId) {
      fetchProfile(userId);
    } else {
      setLoading(false);
    }
  }, [userId, fetchProfile]);

  // Subscription otimizada para mudanças em tempo real
  useEffect(() => {
    if (!userId || !profile) return;

    const subscription = supabase
      .channel(`profile_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const updatedProfile = payload.new as Profile;
          setProfile(updatedProfile);
          setCachedProfile(userId, updatedProfile);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, profile, setCachedProfile]);

  // Memoizar valores de retorno para evitar re-renders desnecessários
  const memoizedReturn = useMemo(() => ({
    profile,
    loading,
    error,
    updateProfile,
    refetch: () => userId ? fetchProfile(userId) : Promise.resolve()
  }), [profile, loading, error, updateProfile, userId, fetchProfile]);

  return memoizedReturn;
};