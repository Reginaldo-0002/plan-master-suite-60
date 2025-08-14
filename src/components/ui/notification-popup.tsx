import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoleCheck } from "@/hooks/useRoleCheck";
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
  const { isAdmin, isModerator, loading: roleLoading } = useRoleCheck();
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

  const shouldShowNotification = useCallback((notification: any, profile?: any) => {
    if (!user?.id) return false;
    
    console.log('🔍 [NotificationPopup] Verificando notificação:', {
      id: notification.id,
      title: notification.title,
      actionType: notification.notification_metadata?.action_type,
      targetPlans: notification.target_plans,
      targetUsers: notification.target_users,
      isAdmin,
      isModerator,
      userId: user.id
    });

    // CRITICAL: Block ALL admin-targeted notifications for non-admins
    if (notification.target_plans && Array.isArray(notification.target_plans)) {
      if (notification.target_plans.includes('admin')) {
        const canViewAdminNotifications = isAdmin || isModerator;
        console.log('👑 [NotificationPopup] Notificação admin - pode ver:', canViewAdminNotifications, 'isAdmin:', isAdmin, 'isModerator:', isModerator);
        return canViewAdminNotifications;
      }
      
      // Regular plan-based notifications
      if (profile?.plan) {
        const result = notification.target_plans.includes(profile.plan);
        console.log('📋 [NotificationPopup] Verificação por plano:', result, 'plano:', profile.plan);
        return result;
      }
    }
    
    // Check if notification targets specific users
    if (notification.target_users && Array.isArray(notification.target_users)) {
      const result = notification.target_users.includes(user.id);
      console.log('🎯 [NotificationPopup] Verificação por usuário específico:', result);
      return result;
    }

    // CRITICAL: Chat messages notifications ONLY for admins/moderators
    if (notification.notification_metadata?.action_type === 'chat_message') {
      const canViewChatNotifications = isAdmin || isModerator;
      console.log('💬 [NotificationPopup] Notificação de chat - pode ver:', canViewChatNotifications, 'isAdmin:', isAdmin, 'isModerator:', isModerator);
      return canViewChatNotifications;
    }

    // Show to everyone if no specific targeting and NOT a chat/admin message
    if (!notification.target_users && !notification.target_plans) {
      // Never show chat messages to non-admins even if no targeting
      if (notification.notification_metadata?.action_type === 'chat_message') {
        console.log('🚫 [NotificationPopup] Chat sem targeting - bloqueado para não-admin');
        return isAdmin || isModerator;
      }
      console.log('📢 [NotificationPopup] Notificação geral - liberada');
      return true;
    }
    
    console.log('❌ [NotificationPopup] Notificação rejeitada');
    return false;
  }, [user?.id, isAdmin, isModerator]);

  // Stable callback for handling realtime notifications
  const handleRealtimeNotification = useCallback(async (payload: any) => {
    if (!mountedRef.current || !profileCacheRef.current) return;
    
    const newNotification = payload.new as any;
    console.log('Realtime notification received:', {
      id: newNotification.id,
      title: newNotification.title,
      actionType: newNotification.notification_metadata?.action_type,
      targetPlans: newNotification.target_plans,
      isPopup: newNotification.is_popup
    });
    
    if (newNotification.is_popup) {
      const profile = profileCacheRef.current?.profile;
      
      const shouldShow = shouldShowNotification(newNotification, profile);
      console.log('🔔 [NotificationPopup] Should show realtime notification:', shouldShow, { 
        isAdmin, 
        isModerator, 
        actionType: newNotification.notification_metadata?.action_type,
        targetPlans: newNotification.target_plans,
        title: newNotification.title 
      });
      
      if (shouldShow) {
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
            console.log('Notification already exists, skipping');
            return prev;
          }
          console.log('Adding new notification to popup');
          return [...prev, formattedNotification];
        });
      }
    }
  }, [shouldShowNotification]);

  // Fetch and cache user profile data
  const fetchUserProfile = useCallback(async () => {
    if (!user?.id) return null;

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, plan')
        .eq('user_id', user.id)
        .single();

      console.log('Profile cache updated:', { profile, userId: user.id });
      profileCacheRef.current = { profile, isAdmin: false }; // isAdmin will come from useRoleCheck
      return { profile, isAdmin: false };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, [user?.id]);

  // Main effect for setting up notifications
  useEffect(() => {
    if (loading || roleLoading || !user?.id) return;
    
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
  }, [user?.id, loading, roleLoading, isAdmin, isModerator, cleanupChannel, fetchUserProfile, handleRealtimeNotification]);

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
      if (!profile) {
        console.log('No profile data available for notifications');
        return;
      }

      console.log('Fetching notifications for user:', { userId: user.id, isAdmin, plan: profile.plan });

      // Fetch viewed notifications only for admins/moderators
      let viewedIds: string[] = [];
      if (isAdmin || isModerator) {
        const { data: viewedNotifications } = await supabase
          .from('admin_notification_views')
          .select('notification_id')
          .eq('admin_id', user.id);
        viewedIds = viewedNotifications?.map(v => v.notification_id) || [];
      }

      // Build query with improved SQL syntax
      let query = supabase
        .from('notifications')
        .select('id, title, message, type, popup_duration, created_at, target_users, target_plans, is_popup, notification_metadata')
        .eq('is_active', true)
        .eq('is_popup', true);

      // Exclude viewed notifications only for admins/moderators
      if ((isAdmin || isModerator) && viewedIds.length > 0) {
        query = query.not('id', 'in', `(${viewedIds.join(',')})`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Raw notifications fetched:', data?.length || 0);

      // Filter notifications with Set for better performance
      const existingIds = new Set();
      const uniqueNotifications = (data || []).filter((notification: any) => {
        if (existingIds.has(notification.id)) return false;
        existingIds.add(notification.id);
        
        // CRITICAL: Block admin notifications for non-admins
        if (notification.target_plans && notification.target_plans.includes('admin') && !isAdmin && !isModerator) {
          console.log('🚫 [NotificationPopup] BLOQUEANDO notificação admin para usuário comum:', notification.id, 'isAdmin:', isAdmin, 'isModerator:', isModerator);
          return false;
        }
        
        // Extra verificação CRÍTICA para chat_message - NUNCA mostrar para usuários comuns
        if (notification.notification_metadata?.action_type === 'chat_message' && !isAdmin && !isModerator) {
          console.log('🚫 [NotificationPopup] BLOQUEANDO notificação de chat na listagem para usuário comum:', notification.id, 'isAdmin:', isAdmin, 'isModerator:', isModerator);
          return false;
        }
        
        const shouldShow = shouldShowNotification(notification, profile);
        console.log('📋 [NotificationPopup] Notification filter:', {
          id: notification.id,
          title: notification.title,
          actionType: notification.notification_metadata?.action_type,
          targetPlans: notification.target_plans,
          shouldShow,
          isAdmin,
          isModerator
        });
        return shouldShow;
      }).map((notification: any) => ({
        ...notification,
        notification_metadata: notification.notification_metadata as {
          user_id?: string;
          user_name?: string;
          ticket_id?: string;
          action_type?: string;
        } | null
      }));

      console.log('Filtered notifications:', uniqueNotifications.length);

      if (mountedRef.current) {
        setNotifications(uniqueNotifications);
      }
    } catch (error) {
      console.error('Error fetching popup notifications:', error);
    }
  }, [user?.id, shouldShowNotification]);


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

      // Redirect if it's a chat notification with specific user and ticket
      if (notification.notification_metadata?.action_type === 'chat_message' && 
          notification.notification_metadata?.user_id && 
          notification.notification_metadata?.ticket_id) {
        
        console.log('Processing chat notification click:', {
          userId: notification.notification_metadata.user_id,
          userName: notification.notification_metadata.user_name,
          ticketId: notification.notification_metadata.ticket_id
        });
        
        // Store user and ticket info in sessionStorage for the admin chat
        const notificationInfo = {
          userId: notification.notification_metadata.user_id,
          userName: notification.notification_metadata.user_name,
          ticketId: notification.notification_metadata.ticket_id,
          timestamp: Date.now(),
          forceOpen: true
        };
        
        sessionStorage.setItem('adminChatNotification', JSON.stringify(notificationInfo));
        console.log('Stored notification info in sessionStorage:', notificationInfo);
        
        // Navigate without reload - use proper navigation
        if (window.location.pathname !== '/admin') {
          console.log('Redirecting to admin panel...');
          window.location.href = `/admin#support`;
        } else {
          console.log('Already on admin panel, triggering chat open...');
          // Trigger immediate processing without reload
          window.location.hash = 'support';
          // Dispatch custom event to force processing
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('openAdminChat', {
              detail: notificationInfo
            }));
          }, 100);
        }
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

  if (loading || roleLoading || isLoading || notifications.length === 0) return null;

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