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
      console.log('Checking chat restrictions for user:', userId);

      // Verificar bloqueio global
      const { data: globalSettings, error: globalError } = await supabase
        .from('admin_settings')
        .select('chat_blocked_until')
        .eq('key', 'global_chat_settings')
        .maybeSingle();

      if (globalError) {
        console.error('Error checking global settings:', globalError);
      } else {
        console.log('Global settings:', globalSettings);
      }

      if (globalSettings?.chat_blocked_until) {
        const blockUntil = new Date(globalSettings.chat_blocked_until);
        console.log('Global block until:', blockUntil, 'Current time:', new Date());
        if (blockUntil > new Date()) {
          console.log('User is globally blocked');
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
      const { data: userRestriction, error: userError } = await supabase
        .from('user_chat_restrictions')
        .select('blocked_until, reason')
        .eq('user_id', userId)
        .gt('blocked_until', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (userError) {
        console.error('Error checking user restrictions:', userError);
      } else {
        console.log('User restriction:', userRestriction);
      }

      if (userRestriction?.blocked_until) {
        const blockUntil = new Date(userRestriction.blocked_until);
        console.log('User block until:', blockUntil, 'Current time:', new Date());
        if (blockUntil > new Date()) {
          console.log('User is specifically blocked');
          setRestriction({
            isBlocked: true,
            reason: userRestriction.reason || 'Você foi temporariamente bloqueado do chat',
            blockedUntil: blockUntil
          });
          setLoading(false);
          return;
        }
      }

      console.log('User is not blocked');
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

    if (!userId) return;

    // Configurar real-time para admin_settings
    const adminChannel = supabase
      .channel(`admin-settings-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_settings',
          filter: 'key=eq.global_chat_settings'
        },
        (payload) => {
          console.log('Admin settings change detected:', payload);
          checkRestrictions();
        }
      )
      .subscribe();

    // Configurar real-time para user_chat_restrictions
    const restrictionsChannel = supabase
      .channel(`user-restrictions-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_chat_restrictions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('User restrictions change detected:', payload);
          checkRestrictions();
        }
      )
      .subscribe();

    // Verificar restrições a cada 30 segundos para detecção mais rápida
    const interval = setInterval(() => {
      console.log('Periodic check for chat restrictions');
      checkRestrictions();
    }, 30000);

    return () => {
      supabase.removeChannel(adminChannel);
      supabase.removeChannel(restrictionsChannel);
      clearInterval(interval);
    };
  }, [userId]);

  return { restriction, loading, checkRestrictions };
};