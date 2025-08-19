import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRoleCheck } from '@/hooks/useRoleCheck';

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
  const { isAdmin, isModerator, loading: roleLoading } = useRoleCheck();

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

    // Se ainda está carregando roles, aguardar
    if (roleLoading) {
      return;
    }

    try {
      const currentTime = new Date();

      // ===== VERIFICAR SE É ADMIN/MODERATOR PRIMEIRO =====
      if (isAdmin || isModerator) {
        setRestriction({
          isBlocked: false,
          reason: null,
          blockedUntil: null
        });
        setLoading(false);
        return;
      }

      // ===== VERIFICAR BLOQUEIO GLOBAL PRIMEIRO (PRIORITÁRIO) =====
      const { data: globalSettings, error: globalError } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('key', 'global_chat_settings')
        .maybeSingle();
      
      if (globalError && process.env.NODE_ENV === 'development') {
        console.error('❌ [useChatRestrictions] Erro ao buscar configurações globais:', globalError);
      }

      // Forçar verificação do bloqueio global
      if (globalSettings && globalSettings.chat_blocked_until) {
        const blockUntil = new Date(globalSettings.chat_blocked_until);
        const isGloballyBlocked = blockUntil > currentTime;
        
        if (isGloballyBlocked) {
          setRestriction({
            isBlocked: true,
            reason: (globalSettings.value as any)?.reason || 'Chat bloqueado globalmente pelo administrador',
            blockedUntil: blockUntil
          });
          setLoading(false);
          return;
        }
      }

      // ===== VERIFICAR BLOQUEIO ESPECÍFICO DO USUÁRIO =====
      const { data: userRestrictions, error: userError } = await supabase
        .from('user_chat_restrictions')
        .select('id, blocked_until, reason, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (userError && process.env.NODE_ENV === 'development') {
        console.error('❌ [useChatRestrictions] Erro ao verificar restrições do usuário:', userError);
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

      // ===== NENHUM BLOQUEIO ATIVO =====
      setRestriction({
        isBlocked: false,
        reason: null,
        blockedUntil: null
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('💥 [useChatRestrictions] Erro ao verificar restrições:', error);
      }
      // Em caso de erro, bloquear por segurança
      setRestriction({
        isBlocked: true,
        reason: 'Erro ao verificar permissões do chat',
        blockedUntil: null
      });
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin, isModerator, roleLoading]);

  useEffect(() => {
    // Não executar se ainda está carregando roles
    if (roleLoading) {
      return;
    }
    
    // Executar verificação inicial apenas uma vez
    checkRestrictions();

    if (!userId) {
      return;
    }

    // Real-time subscription para mudanças nas restrições do usuário (otimizado)
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
          setTimeout(checkRestrictions, 500);
        }
      )
      .subscribe();

    // Real-time subscription para configurações globais (otimizado)
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
          setTimeout(checkRestrictions, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(restrictionsChannel);
      supabase.removeChannel(adminChannel);
    };
  }, [userId, roleLoading, isAdmin, isModerator, checkRestrictions]);

  return { restriction, loading, checkRestrictions };
};