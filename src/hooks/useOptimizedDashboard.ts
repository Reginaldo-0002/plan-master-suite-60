import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseWrapper } from '@/lib/supabaseWrapper';
import { useErrorHandler } from './useErrorHandler';

interface DashboardData {
  contents: any[];
  notifications: any[];
  carouselContent: any[];
  profile: any;
  userStats: {
    totalSessions: number;
    areasAccessed: number;
    lastActivity: string;
  };
}

export const useOptimizedDashboard = (userId?: string) => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    contents: [],
    notifications: [],
    carouselContent: [],
    profile: null,
    userStats: {
      totalSessions: 0,
      areasAccessed: 0,
      lastActivity: ''
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const { handleAsyncError } = useErrorHandler();

  // Batch fetch all dashboard data in parallel
  const fetchDashboardData = useCallback(async (userPlan: string = 'free') => {
    if (!userId) return;

    setIsLoading(true);
    
    try {
      // Fetch profile first to resolve the correct plan, then fetch the rest in parallel
      const profileResult = await SupabaseWrapper.getUserProfile(userId);
      const resolvedPlan = userPlan || profileResult.data?.plan || 'free';

      const [contentsResult, notificationsResult] = await Promise.all([
        SupabaseWrapper.getRecentContent(),
        SupabaseWrapper.getNotifications([resolvedPlan, 'admin'])
      ]);

      const newDashboardData: DashboardData = {
        contents: contentsResult.data || [],
        notifications: notificationsResult.data || [],
        carouselContent: (contentsResult.data || []).filter((c: any) => c.show_in_carousel),
        profile: profileResult.data || null,
        userStats: {
          totalSessions: profileResult.data?.total_session_time || 0,
          areasAccessed: profileResult.data?.areas_accessed || 0,
          lastActivity: profileResult.data?.last_activity || ''
        }
      };

      setDashboardData(newDashboardData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Memoized filtered data
  const recentContents = useMemo(() => 
    dashboardData.contents.slice(0, 6),
    [dashboardData.contents]
  );

  const activeNotifications = useMemo(() => 
    dashboardData.notifications.filter(n => n.is_active),
    [dashboardData.notifications]
  );

  // Effect to fetch data when userId changes and react to real-time profile updates (e.g., plan changes)
  useEffect(() => {
    if (userId) {
      fetchDashboardData();
    }

    const handler = (e: any) => {
      const updatedPlan = e.detail?.profile?.plan as string | undefined;
      fetchDashboardData(updatedPlan);
    };
    window.addEventListener('profile-updated', handler);

    return () => {
      window.removeEventListener('profile-updated', handler);
    };
  }, [userId, fetchDashboardData]);

  // Optimized refresh function
  const refreshData = useCallback(async (userPlan?: string) => {
    await fetchDashboardData(userPlan);
  }, [fetchDashboardData]);

  return {
    dashboardData,
    recentContents,
    activeNotifications,
    isLoading,
    refreshData,
    fetchDashboardData
  };
};