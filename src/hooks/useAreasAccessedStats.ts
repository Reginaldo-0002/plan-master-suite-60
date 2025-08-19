import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useAreasAccessedStats = () => {
  const [areasAccessed, setAreasAccessed] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const channelRef = useRef<any>(null);

  const fetchAreasAccessedStats = async () => {
    if (!user) return;

    try {
      // Query otimizada usando COUNT DISTINCT
      const { count, error } = await supabase
        .from('user_area_tracking')
        .select('area_name', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('📍 Areas accessed loaded:', count);
      setAreasAccessed(count || 0);

      // Atualizar também no perfil para manter sincronizado (sem aguardar)
      if (count && count > 0) {
        const updateProfile = async () => {
          try {
            await supabase
              .from('profiles')
              .update({ 
                areas_accessed: count,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id);
          } catch (err) {
            console.error('Error updating profile:', err);
          }
        };
        updateProfile();
      }
    } catch (error) {
      console.error('❌ Error fetching areas accessed:', error);
      setAreasAccessed(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreasAccessedStats();
    
    // Set up real-time listener otimizado - apenas 1 por usuário
    if (user && !channelRef.current) {
      channelRef.current = supabase
        .channel(`area-tracking-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_area_tracking',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            console.log('📍 Area tracking changed, refetching stats...');
            // Debounce para evitar múltiplas chamadas seguidas
            setTimeout(fetchAreasAccessedStats, 1000);
          }
        )
        .subscribe();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);

  return { areasAccessed, loading, refetch: fetchAreasAccessedStats };
};