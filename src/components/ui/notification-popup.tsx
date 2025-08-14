import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, Bell, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PopupNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  popup_duration: number | null;
  created_at: string;
  is_popup?: boolean;
  target_users?: string[] | null;
  target_plans?: string[] | null;
  notification_metadata?: {
    user_id?: string;
    user_name?: string;
    ticket_id?: string;
    action_type?: string;
  } | null;
}

export const NotificationPopup = () => {
  const [notifications, setNotifications] = useState<PopupNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user, loading } = useAuth();
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const profileCacheRef = useRef<{ profile: any; isAdmin: boolean } | null>(null);

  // Cleanup function to remove old channel
  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Stable callback for handling realtime notifications
  const handleRealtimeNotification = useCallback(async (payload: any) => {
    if (!mountedRef.current) return;
    
    const newNotification = payload.new as any;
    
    if (newNotification.is_popup && profileCacheRef.current) {
      const { profile, isAdmin } = profileCacheRef.current;
      
      if (shouldShowNotification(newNotification, { ...profile, isAdmin })) {
        const formattedNotification: PopupNotification = {
          ...newNotification,
          notification_metadata: newNotification.notification_metadata as {
            user_id?: string;
            user_name?: string;
            ticket_id?: string;
            action_type?: string;
          } | null
        };
        
        setNotifications(prev => {
          // Use Set for better duplicate checking
          const existingIds = new Set(prev.map(n => n.id));
          if (existingIds.has(formattedNotification.id)) {
            return prev;
          }
          return [...prev, formattedNotification];
        });
      }
    }
  }, []);

  // Fetch and cache user profile data
  const fetchUserProfile = useCallback(async () => {
    if (!user?.id) return null;

    try {
      const [profileResponse, userRoleResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, plan')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single()
      ]);

      const profile = profileResponse.data;
      const isAdmin = userRoleResponse.data?.role === 'admin';

      profileCacheRef.current = { profile, isAdmin };
      return { profile, isAdmin };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, [user?.id]);

  // Main effect for setting up notifications
  useEffect(() => {
    if (loading || !user?.id) return;
    
    let isCancelled = false;
    
    const initializeNotifications = async () => {
      try {
        setIsLoading(true);
        
        // Cleanup previous channel
        cleanupChannel();
        
        // Fetch user profile and cache it
        const profileData = await fetchUserProfile();
        if (isCancelled || !profileData) return;
        
        // Fetch initial notifications
        await fetchPopupNotifications(profileData);
        if (isCancelled) return;
        
        // Setup realtime channel with unique name
        const channelName = `popup-notifications-${user.id}-${Date.now()}`;
        const channel = supabase
          .channel(channelName)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications'
          }, handleRealtimeNotification)
          .subscribe();

        channelRef.current = channel;
      } catch (error) {
        console.error('Error initializing notifications:', error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    initializeNotifications();

    return () => {
      isCancelled = true;
      cleanupChannel();
    };
  }, [user?.id, loading, cleanupChannel, fetchUserProfile, handleRealtimeNotification]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanupChannel();
    };
  }, [cleanupChannel]);

  const fetchPopupNotifications = useCallback(async (profileData?: { profile: any; isAdmin: boolean }) => {
    if (!user?.id) return;
    
    try {
      const { profile, isAdmin } = profileData || profileCacheRef.current || {};
      if (!profile) return;

      // Fetch viewed notifications
      const { data: viewedNotifications } = await supabase
        .from('admin_notification_views')
        .select('notification_id')
        .eq('admin_id', user.id);

      const viewedIds = viewedNotifications?.map(v => v.notification_id) || [];

      // Build query with improved SQL syntax
      let query = supabase
        .from('notifications')
        .select('id, title, message, type, popup_duration, created_at, target_users, target_plans, is_popup, notification_metadata')
        .eq('is_active', true)
        .eq('is_popup', true);

      // Use proper SQL syntax for NOT IN condition
      if (viewedIds.length > 0) {
        query = query.not('id', 'in', `(${viewedIds.map(id => `'${id}'`).join(',')})`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Filter notifications with Set for better performance
      const existingIds = new Set();
      const uniqueNotifications = (data || []).filter((notification: any) => {
        if (existingIds.has(notification.id)) return false;
        existingIds.add(notification.id);
        return shouldShowNotification(notification, { ...profile, isAdmin });
      }).map((notification: any) => ({
        ...notification,
        notification_metadata: notification.notification_metadata as {
          user_id?: string;
          user_name?: string;
          ticket_id?: string;
          action_type?: string;
        } | null
      }));

      if (mountedRef.current) {
        setNotifications(uniqueNotifications);
      }
    } catch (error) {
      console.error('Error fetching popup notifications:', error);
    }
  }, [user?.id]);

  const shouldShowNotification = useCallback((notification: any, profile?: any) => {
    if (!user?.id) return false;
    
    // Check if notification targets specific users
    if (notification.target_users && Array.isArray(notification.target_users)) {
      return notification.target_users.includes(user.id);
    }

    // Check if notification targets specific plans
    if (notification.target_plans && Array.isArray(notification.target_plans) && profile) {
      // Admin notifications should show for admins
      if (notification.target_plans.includes('admin') && profile.isAdmin) {
        return true;
      }
      return notification.target_plans.includes(profile.plan);
    }

    // Show to everyone if no specific targeting
    return !notification.target_users && !notification.target_plans;
  }, [user?.id]);

  const handleNotificationClick = useCallback(async (notification: PopupNotification) => {
    if (!user?.id || !mountedRef.current) return;
    
    try {
      // Remove from local list immediately to prevent multiple clicks
      setNotifications(prev => prev.filter(n => n.id !== notification.id));

      // Mark as viewed in database (upsert to prevent duplicates)
      await supabase
        .from('admin_notification_views')
        .upsert({
          admin_id: user.id,
          notification_id: notification.id
        }, {
          onConflict: 'admin_id,notification_id'
        });

      // Redirect if it's a chat notification
      if (notification.notification_metadata?.action_type === 'chat_message' && 
          notification.notification_metadata?.user_id) {
        window.location.href = `/admin#support`;
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
      // Notification was already removed from list, don't revert
    }
  }, [user?.id]);

  const removeNotification = useCallback(async (id: string) => {
    if (!user?.id || !mountedRef.current) return;
    
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    // Mark as viewed in database
    try {
      await supabase
        .from('admin_notification_views')
        .upsert({
          admin_id: user.id,
          notification_id: id
        }, {
          onConflict: 'admin_id,notification_id'
        });
    } catch (error) {
      console.error('Error marking notification as viewed:', error);
    }
  }, [user?.id]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'warning':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'error':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  // Auto remove notifications after their duration (only if duration is set)
  useEffect(() => {
    if (!mountedRef.current) return;
    
    const timers: NodeJS.Timeout[] = [];
    
    notifications.forEach(notification => {
      const duration = notification.popup_duration;
      if (duration && duration > 0) {
        const timer = setTimeout(() => {
          if (mountedRef.current) {
            removeNotification(notification.id);
          }
        }, duration);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, removeNotification]);

  if (loading || isLoading || notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className={`w-80 shadow-lg border-l-4 ${getBackgroundColor(notification.type)} animate-in slide-in-from-right duration-300 cursor-pointer hover:shadow-xl transition-all`}
          onClick={() => handleNotificationClick(notification)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold mb-1">
                  {notification.title}
                </h4>
                <p className="text-sm opacity-90">
                  {notification.message}
                </p>
                {notification.notification_metadata?.action_type === 'chat_message' && (
                  <p className="text-xs mt-1 opacity-75 italic">
                    Clique para responder no chat
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};