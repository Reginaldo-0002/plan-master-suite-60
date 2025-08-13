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
  notification_metadata?: {
    user_id?: string;
    user_name?: string;
    ticket_id?: string;
    action_type?: string;
  } | null;
}

export const NotificationPopup = () => {
  const [notifications, setNotifications] = useState<PopupNotification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    fetchPopupNotifications();

    // Configurar canal de tempo real
    const channel = supabase
      .channel('popup-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, async (payload) => {
        const newNotification = payload.new as any;
        
        if (newNotification.is_popup) {
          // Buscar informações do usuário para verificar se deve mostrar
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, plan')
            .eq('user_id', user?.id)
            .single();

          const { data: userRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user?.id)
            .single();

          const isAdmin = userRole?.role === 'admin';
          
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
            setNotifications(prev => [...prev, formattedNotification]);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchPopupNotifications = async () => {
    try {
      // Buscar perfil e role do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, plan, role')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Buscar role na tabela user_roles
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      const isAdmin = userRole?.role === 'admin';

      // Buscar notificações que não foram visualizadas pelo admin
      const { data: viewedNotifications } = await supabase
        .from('admin_notification_views')
        .select('notification_id')
        .eq('admin_id', user?.id);

      const viewedIds = viewedNotifications?.map(v => v.notification_id) || [];

      let query = supabase
        .from('notifications')
        .select('id, title, message, type, popup_duration, created_at, target_users, target_plans, is_popup, notification_metadata')
        .eq('is_active', true)
        .eq('is_popup', true);

      // Only add the NOT IN condition if there are viewed notifications
      if (viewedIds.length > 0) {
        query = query.not('id', 'in', `(${viewedIds.join(',')})`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const filteredNotifications = (data || []).filter(notification => 
        shouldShowNotification(notification, { ...profile, isAdmin })
      ).map(notification => ({
        ...notification,
        notification_metadata: notification.notification_metadata as {
          user_id?: string;
          user_name?: string;
          ticket_id?: string;
          action_type?: string;
        } | null
      }));

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
      // Admin notifications should show for admins
      if (notification.target_plans.includes('admin') && profile.isAdmin) {
        return true;
      }
      return notification.target_plans.includes(profile.plan);
    }

    // Show to everyone if no specific targeting
    return !notification.target_users && !notification.target_plans;
  };

  const handleNotificationClick = async (notification: PopupNotification) => {
    try {
      // Marcar como visualizada no banco
      await supabase
        .from('admin_notification_views')
        .insert({
          admin_id: user?.id,
          notification_id: notification.id
        });

      // Remover da lista local
      setNotifications(prev => prev.filter(n => n.id !== notification.id));

      // Redirecionar se for notificação de chat
      if (notification.notification_metadata?.action_type === 'chat_message' && 
          notification.notification_metadata?.user_id) {
        // Navegar para o painel admin com o suporte ativo
        window.location.href = `/admin#support`;
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
      // Remover da lista mesmo se houver erro
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }
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
    notifications.forEach(notification => {
      const duration = notification.popup_duration;
      if (duration && duration > 0) {
        setTimeout(() => {
          removeNotification(notification.id);
        }, duration);
      }
    });
  }, [notifications]);

  if (notifications.length === 0) return null;

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