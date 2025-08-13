import { useState, useEffect } from "react";
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
}

export const NotificationPopup = () => {
  const [notifications, setNotifications] = useState<PopupNotification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    fetchPopupNotifications();

    const channel = supabase
      .channel('popup-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        const newNotification = payload.new as PopupNotification;
        if (newNotification.is_popup && shouldShowNotification(newNotification)) {
          setNotifications(prev => [...prev, newNotification]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchPopupNotifications = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, plan')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, type, popup_duration, created_at, target_users, target_plans')
        .eq('is_active', true)
        .eq('is_popup', true)
        .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
        .order('created_at', { ascending: false });

      if (error) throw error;

      const filteredNotifications = (data || []).filter(notification => 
        shouldShowNotification(notification, profile)
      );

      setNotifications(filteredNotifications);
    } catch (error) {
      console.error('Error fetching popup notifications:', error);
    }
  };

  const shouldShowNotification = (notification: any, profile?: any) => {
    // Check if notification targets specific users
    if (notification.target_users && Array.isArray(notification.target_users)) {
      return notification.target_users.includes(user?.id);
    }

    // Check if notification targets specific plans
    if (notification.target_plans && Array.isArray(notification.target_plans) && profile) {
      return notification.target_plans.includes(profile.plan);
    }

    // Show to everyone if no specific targeting
    return !notification.target_users && !notification.target_plans;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

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
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  // Auto remove notifications after their duration
  useEffect(() => {
    notifications.forEach(notification => {
      const duration = notification.popup_duration || 5000;
      setTimeout(() => {
        removeNotification(notification.id);
      }, duration);
    });
  }, [notifications]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className={`w-80 shadow-lg border-l-4 ${getBackgroundColor(notification.type)} animate-in slide-in-from-right duration-300`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground mb-1">
                  {notification.title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {notification.message}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-transparent"
                onClick={() => removeNotification(notification.id)}
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