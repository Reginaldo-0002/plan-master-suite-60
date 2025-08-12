import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChatRestriction {
  isBlocked: boolean;
  reason: string | null;
  blockedUntil: Date | null;
}

export const useChatRestrictions = (userId: string | undefined) => {
  const [restriction, setRestriction] = useState<ChatRestriction>({
    isBlocked: false,
    reason: null,
    blockedUntil: null
  });
  const [loading, setLoading] = useState(true);

  const checkRestrictions = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Verificar bloqueio global
      const { data: globalSettings } = await supabase
        .from('admin_settings')
        .select('chat_blocked_until')
        .eq('key', 'global_chat_settings')
        .maybeSingle();

      if (globalSettings?.chat_blocked_until) {
        const blockUntil = new Date(globalSettings.chat_blocked_until);
        if (blockUntil > new Date()) {
          setRestriction({
            isBlocked: true,
            reason: 'Chat bloqueado globalmente pelo administrador',
            blockedUntil: blockUntil
          });
          setLoading(false);
          return;
        }
      }

      // Verificar bloqueio específico do usuário
      const { data: userRestriction } = await supabase
        .from('user_chat_restrictions')
        .select('blocked_until, reason')
        .eq('user_id', userId)
        .gt('blocked_until', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (userRestriction?.blocked_until) {
        const blockUntil = new Date(userRestriction.blocked_until);
        if (blockUntil > new Date()) {
          setRestriction({
            isBlocked: true,
            reason: userRestriction.reason || 'Você foi temporariamente bloqueado do chat',
            blockedUntil: blockUntil
          });
          setLoading(false);
          return;
        }
      }

      setRestriction({
        isBlocked: false,
        reason: null,
        blockedUntil: null
      });
    } catch (error) {
      console.error('Error checking chat restrictions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkRestrictions();

    // Configurar real-time para admin_settings
    const adminChannel = supabase
      .channel('admin-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_settings',
          filter: 'key=eq.global_chat_settings'
        },
        () => {
          checkRestrictions();
        }
      )
      .subscribe();

    // Configurar real-time para user_chat_restrictions
    const restrictionsChannel = supabase
      .channel('user-restrictions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_chat_restrictions',
          filter: userId ? `user_id=eq.${userId}` : undefined
        },
        () => {
          checkRestrictions();
        }
      )
      .subscribe();

    // Verificar restrições a cada minuto para expiração automática
    const interval = setInterval(checkRestrictions, 60000);

    return () => {
      supabase.removeChannel(adminChannel);
      supabase.removeChannel(restrictionsChannel);
      clearInterval(interval);
    };
  }, [userId]);

  return { restriction, loading, checkRestrictions };
};