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
      console.log('🚫 No userId provided');
      setRestriction({
        isBlocked: false,
        reason: null,
        blockedUntil: null
      });
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 [CHAT RESTRICTIONS] Checking for user:', userId);
      
      const currentTime = new Date();
      console.log('🕐 [CHAT RESTRICTIONS] Current time (UTC):', currentTime.toISOString());

      // ======= VERIFICAR BLOQUEIO ESPECÍFICO DO USUÁRIO PRIMEIRO =======
      const { data: userRestrictions, error: userError } = await supabase
        .from('user_chat_restrictions')
        .select('id, blocked_until, reason, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      console.log('📋 [CHAT RESTRICTIONS] User restrictions found:', userRestrictions?.length || 0);
      if (userError) {
        console.error('❌ [CHAT RESTRICTIONS] Error checking user restrictions:', userError);
      }

      // Verificar se há alguma restrição ativa
      let activeUserRestriction = null;
      if (userRestrictions && userRestrictions.length > 0) {
        for (const restriction of userRestrictions) {
          if (restriction.blocked_until) {
            const blockUntil = new Date(restriction.blocked_until);
            const isActive = blockUntil > currentTime;
            
            console.log(`⏰ [CHAT RESTRICTIONS] Restriction ${restriction.id}: active=${isActive}, until=${blockUntil.toISOString()}`);
            
            if (isActive) {
              activeUserRestriction = restriction;
              console.log('🚫 [CHAT RESTRICTIONS] FOUND ACTIVE USER RESTRICTION');
              break;
            }
          }
        }
      }

      if (activeUserRestriction) {
        const blockUntil = new Date(activeUserRestriction.blocked_until);
        console.log('🚫 USER IS SPECIFICALLY BLOCKED UNTIL:', blockUntil.toISOString());
        setRestriction({
          isBlocked: true,
          reason: activeUserRestriction.reason || 'Você foi temporariamente bloqueado do chat',
          blockedUntil: blockUntil
        });
        setLoading(false);
        return;
      }

      // ======= VERIFICAR BLOQUEIO GLOBAL APENAS SE NÃO HÁ BLOQUEIO ESPECÍFICO =======
      console.log('🌐 [CHAT RESTRICTIONS] Checking global restrictions...');
      const { data: globalSettings, error: globalError } = await supabase
        .from('admin_settings')
        .select('chat_blocked_until')
        .eq('key', 'global_chat_settings')
        .maybeSingle();

      if (globalSettings?.chat_blocked_until) {
        const blockUntil = new Date(globalSettings.chat_blocked_until);
        const isGloballyBlocked = blockUntil > currentTime;
        
        if (isGloballyBlocked) {
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

      console.log('✅ [CHAT RESTRICTIONS] USER IS NOT BLOCKED - CHAT ALLOWED');
      setRestriction({
        isBlocked: false,
        reason: null,
        blockedUntil: null
      });
    } catch (error) {
      console.error('💥 [CHAT RESTRICTIONS] Error checking chat restrictions:', error);
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
          console.log('🔄 [CHAT RESTRICTIONS] User restrictions change detected:', payload);
          setTimeout(checkRestrictions, 500);
        }
      )
      .subscribe();

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
          console.log('🔄 [CHAT RESTRICTIONS] Admin settings change detected:', payload);
          setTimeout(checkRestrictions, 500);
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 [CHAT RESTRICTIONS] Cleaning up listeners');
      supabase.removeChannel(restrictionsChannel);
      supabase.removeChannel(adminChannel);
    };
  }, [userId, checkRestrictions]);

  return { restriction, loading, checkRestrictions };
};