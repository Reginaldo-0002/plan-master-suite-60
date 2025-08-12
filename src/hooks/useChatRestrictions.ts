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
      console.log('🕐 Current time (local):', currentTime.toISOString());
      console.log('🕐 Current time (formatted):', currentTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));

      // Verificar bloqueio específico do usuário PRIMEIRO (mais simples e direto)
      const { data: userRestrictions, error: userError } = await supabase
        .from('user_chat_restrictions')
        .select('id, blocked_until, reason, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      console.log('📋 All user restrictions found:', userRestrictions);
      console.log('❓ User error:', userError);

      if (userError) {
        console.error('❌ Error checking user restrictions:', userError);
      }

      // Verificar se há alguma restrição ativa (simples verificação)
      let activeRestriction = null;
      if (userRestrictions && userRestrictions.length > 0) {
        console.log(`📊 Total restrictions found: ${userRestrictions.length}`);
        for (const restriction of userRestrictions) {
          if (restriction.blocked_until) {
            const blockUntil = new Date(restriction.blocked_until);
            const isActive = blockUntil > currentTime;
            console.log(`⏰ Checking restriction ID ${restriction.id}:`);
            console.log(`   - blocked until: ${blockUntil.toISOString()}`);
            console.log(`   - blocked until (BR): ${blockUntil.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
            console.log(`   - current time: ${currentTime.toISOString()}`);
            console.log(`   - current time (BR): ${currentTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
            console.log(`   - is active? ${isActive}`);
            console.log(`   - time difference (minutes): ${((blockUntil.getTime() - currentTime.getTime()) / (1000 * 60)).toFixed(2)}`);
            console.log(`   - reason: ${restriction.reason}`);
            
            if (isActive) {
              activeRestriction = restriction;
              console.log('🚫 FOUND ACTIVE RESTRICTION:', activeRestriction);
              break;
            } else {
              console.log('⏰ Restriction expired, skipping');
            }
          }
        }
      }

      if (activeRestriction) {
        const blockUntil = new Date(activeRestriction.blocked_until);
        console.log('🚫 USER IS SPECIFICALLY BLOCKED UNTIL:', blockUntil.toISOString());
        console.log('🚫 USER IS SPECIFICALLY BLOCKED UNTIL (BR):', blockUntil.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
        setRestriction({
          isBlocked: true,
          reason: activeRestriction.reason || 'Você foi temporariamente bloqueado do chat',
          blockedUntil: blockUntil
        });
        setLoading(false);
        return;
      }

      // Verificar bloqueio global apenas se não há bloqueio específico
      const { data: globalSettings, error: globalError } = await supabase
        .from('admin_settings')
        .select('chat_blocked_until')
        .eq('key', 'global_chat_settings')
        .maybeSingle();

      console.log('🌐 Global settings:', globalSettings);
      console.log('❓ Global error:', globalError);

      if (globalSettings?.chat_blocked_until) {
        const blockUntil = new Date(globalSettings.chat_blocked_until);
        console.log(`🌍 Global block until: ${blockUntil.toISOString()}, current time: ${currentTime.toISOString()}`);
        console.log(`🌍 Is globally active? ${blockUntil > currentTime}`);
        
        if (blockUntil > currentTime) {
          console.log('🌍 CHAT GLOBALLY BLOCKED UNTIL:', blockUntil.toISOString());
          setRestriction({
            isBlocked: true,
            reason: 'Chat bloqueado globalmente pelo administrador',
            blockedUntil: blockUntil
          });
          setLoading(false);
          return;
        }
      }

      console.log('✅ USER IS NOT BLOCKED - CHAT ALLOWED');
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