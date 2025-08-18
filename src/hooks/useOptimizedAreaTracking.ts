import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useOptimizedAreaTracking = () => {
  const { user } = useAuth();
  const trackedAreas = useRef(new Set<string>());
  const pendingTrackingRef = useRef<Set<string>>(new Set());

  const trackAreaAccess = useCallback(async (areaName: string) => {
    if (!user || trackedAreas.current.has(areaName) || pendingTrackingRef.current.has(areaName)) {
      return;
    }

    // Mark as pending to prevent duplicates
    pendingTrackingRef.current.add(areaName);
    trackedAreas.current.add(areaName);

    // Use requestIdleCallback to defer non-critical tracking
    const trackWhenIdle = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(async () => {
          try {
            await supabase.rpc('track_area_access', {
              area_name_param: areaName
            });
            console.log(`✅ Area access tracked: ${areaName}`);
          } catch (error) {
            console.error('❌ Error tracking area access:', error);
            // Remove from tracked on error so it can be retried
            trackedAreas.current.delete(areaName);
          } finally {
            pendingTrackingRef.current.delete(areaName);
          }
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(async () => {
          try {
            await supabase.rpc('track_area_access', {
              area_name_param: areaName
            });
            console.log(`✅ Area access tracked: ${areaName}`);
          } catch (error) {
            console.error('❌ Error tracking area access:', error);
            trackedAreas.current.delete(areaName);
          } finally {
            pendingTrackingRef.current.delete(areaName);
          }
        }, 0);
      }
    };

    trackWhenIdle();
  }, [user]);

  return { trackAreaAccess };
};