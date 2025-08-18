import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useAreaTracking = () => {
  const { user } = useAuth();

  const trackAreaAccess = useCallback(async (areaName: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('track_area_access', {
        area_name_param: areaName
      });

      if (error) {
        console.error('❌ Error tracking area access:', error);
      } else {
        console.log(`✅ Area access tracked: ${areaName}`);
      }
    } catch (error) {
      console.error('❌ Error tracking area access:', error);
    }
  }, [user]);

  return { trackAreaAccess };
};