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
      setRestriction({
        isBlocked: false,
        reason: null,
        blockedUntil: null
      });
      setLoading(false);
      return;
    }

    try {
      const currentTime = new Date();

      // ======= VERIFICAR BLOQUEIO ESPECÍFICO DO USUÁRIO PRIMEIRO =======
      const { data: userRestrictions, error: userError } = await supabase
        .from('user_chat_restrictions')
        .select('id, blocked_until, reason, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (userError) {
        console.error('❌ Error checking user restrictions:', userError);
      }

      // Verificar se há alguma restrição ativa
      let activeUserRestriction = null;
      if (userRestrictions && userRestrictions.length > 0) {
        for (const restriction of userRestrictions) {
          if (restriction.blocked_until) {
            const blockUntil = new Date(restriction.blocked_until);
            const isActive = blockUntil > currentTime;
            
            if (isActive) {
              activeUserRestriction = restriction;
              break;
            }
          }
        }
      }

      if (activeUserRestriction) {
        const blockUntil = new Date(activeUserRestriction.blocked_until);
        setRestriction({
          isBlocked: true,
          reason: activeUserRestriction.reason || 'Você foi temporariamente bloqueado do chat',
          blockedUntil: blockUntil
        });
        setLoading(false);
        return;
      }

      // ======= VERIFICAR BLOQUEIO GLOBAL SEMPRE =======
      console.log('🔍 Verificando bloqueio global para usuário:', userId);
      const { data: globalSettings, error: globalError } = await supabase
        .from('admin_settings')
        .select('chat_blocked_until')
        .eq('key', 'global_chat_settings')
        .maybeSingle();

      console.log('📊 Configurações globais:', globalSettings);
      console.log('❓ Erro ao buscar configurações globais:', globalError);

      if (globalSettings?.chat_blocked_until) {
        const blockUntil = new Date(globalSettings.chat_blocked_until);
        const isGloballyBlocked = blockUntil > currentTime;
        
        console.log(`⏰ Bloqueio global até: ${blockUntil.toISOString()}`);
        console.log(`⏰ Agora: ${currentTime.toISOString()}`);
        console.log(`🔒 Chat globalmente bloqueado? ${isGloballyBlocked}`);
        
        if (isGloballyBlocked) {
          console.log('🚫 Aplicando bloqueio global para usuário:', userId);
          setRestriction({
            isBlocked: true,
            reason: 'Chat bloqueado globalmente pelo administrador',
            blockedUntil: blockUntil
          });
          setLoading(false);
          return;
        } else {
          console.log('✅ Bloqueio global expirado');
        }
      } else {
        console.log('✅ Nenhum bloqueio global encontrado');
      }

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
          console.log('🔄 User restrictions change detected - rechecking...');
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
          console.log('🔄 Admin settings change detected - rechecking...');
          setTimeout(checkRestrictions, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(restrictionsChannel);
      supabase.removeChannel(adminChannel);
    };
  }, [userId, checkRestrictions]);

  return { restriction, loading, checkRestrictions };
};