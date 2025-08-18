import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useAreasAccessedStats = () => {
  const [areasAccessed, setAreasAccessed] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchAreasAccessedStats = async () => {
    if (!user) return;

    try {
      // Buscar contagem de áreas únicas acessadas
      const { data, error } = await supabase
        .from('user_area_tracking')
        .select('area_name')
        .eq('user_id', user.id);

      if (error) throw error;

      // Contar áreas únicas
      const uniqueAreas = new Set(data?.map(item => item.area_name) || []);
      const count = uniqueAreas.size;

      setAreasAccessed(count);
      console.log('📍 Areas accessed loaded:', count);

      // Atualizar também no perfil para manter sincronizado
      if (count > 0) {
        await supabase
          .from('profiles')
          .update({ 
            areas_accessed: count,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
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
    
    // Set up real-time listener for area tracking changes
    const channel = supabase
      .channel('area-tracking-changes')
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
          fetchAreasAccessedStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { areasAccessed, loading, refetch: fetchAreasAccessedStats };
};