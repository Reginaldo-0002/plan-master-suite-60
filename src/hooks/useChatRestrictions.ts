import { useState, useEffect, useCallback } from 'react';
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

  const checkRestrictions = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Checking chat restrictions for user:', userId);
      const currentTime = new Date();

      // Verificar bloqueio específico do usuário PRIMEIRO
      const { data: userRestrictions, error: userError } = await supabase
        .from('user_chat_restrictions')
        .select('blocked_until, reason, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (userError) {
        console.error('❌ Error checking user restrictions:', userError);
      } else {
        console.log('📋 User restrictions found:', userRestrictions);
      }

      // Verificar se há alguma restrição ativa
      const activeRestriction = userRestrictions?.find(restriction => {
        if (!restriction.blocked_until) return false;
        const blockUntil = new Date(restriction.blocked_until);
        return blockUntil > currentTime;
      });

      if (activeRestriction) {
        const blockUntil = new Date(activeRestriction.blocked_until);
        console.log('🚫 User is specifically blocked until:', blockUntil);
        setRestriction({
          isBlocked: true,
          reason: activeRestriction.reason || 'Você foi temporariamente bloqueado do chat',
          blockedUntil: blockUntil
        });
        setLoading(false);
        return;
      }

      // Verificar bloqueio global
      const { data: globalSettings, error: globalError } = await supabase
        .from('admin_settings')
        .select('chat_blocked_until')
        .eq('key', 'global_chat_settings')
        .maybeSingle();

      if (globalError) {
        console.error('❌ Error checking global settings:', globalError);
      } else {
        console.log('🌐 Global settings:', globalSettings);
      }

      if (globalSettings?.chat_blocked_until) {
        const blockUntil = new Date(globalSettings.chat_blocked_until);
        if (blockUntil > currentTime) {
          console.log('🌍 Chat globally blocked until:', blockUntil);
          setRestriction({
            isBlocked: true,
            reason: 'Chat bloqueado globalmente pelo administrador',
            blockedUntil: blockUntil
          });
          setLoading(false);
          return;
        }
      }

      console.log('✅ User is not blocked');
      setRestriction({
        isBlocked: false,
        reason: null,
        blockedUntil: null
      });
    } catch (error) {
      console.error('💥 Error checking chat restrictions:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkRestrictions();

    if (!userId) return;

    // Real-time subscription para mudanças nas restrições do usuário
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
          console.log('🔄 User restrictions change detected:', payload);
          setTimeout(checkRestrictions, 500); // Pequeno delay para garantir que os dados estão atualizados
        }
      )
      .subscribe((status) => {
        console.log('📡 Restrictions channel status:', status);
      });

    // Real-time subscription para configurações globais
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
          console.log('🔄 Admin settings change detected:', payload);
          setTimeout(checkRestrictions, 500);
        }
      )
      .subscribe((status) => {
        console.log('📡 Admin channel status:', status);
      });

    // Polling como backup (verifica a cada 10 segundos)
    const interval = setInterval(() => {
      console.log('⏰ Periodic restriction check');
      checkRestrictions();
    }, 10000);

    return () => {
      console.log('🧹 Cleaning up chat restrictions listeners');
      supabase.removeChannel(restrictionsChannel);
      supabase.removeChannel(adminChannel);
      clearInterval(interval);
    };
  }, [userId, checkRestrictions]);

  return { restriction, loading, checkRestrictions };
};