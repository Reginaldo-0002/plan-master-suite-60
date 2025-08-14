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
      console.log('⏳ [useChatRestrictions] Aguardando carregamento de roles...');
      return;
    }

    try {
      const currentTime = new Date();
      console.log('🔍 [useChatRestrictions] Verificando restrições para usuário:', userId);
      console.log('👑 [useChatRestrictions] User roles - Admin:', isAdmin, 'Moderator:', isModerator);
      console.log('🕒 [useChatRestrictions] Hora atual:', currentTime.toISOString());

      // ===== VERIFICAR SE É ADMIN/MODERATOR PRIMEIRO =====
      if (isAdmin || isModerator) {
        console.log('👑 [useChatRestrictions] Usuário é admin/moderator - Chat sempre liberado');
        setRestriction({
          isBlocked: false,
          reason: null,
          blockedUntil: null
        });
        setLoading(false);
        return;
      }

      // ===== VERIFICAR BLOQUEIO GLOBAL PRIMEIRO (PRIORITÁRIO) =====
      console.log('🌐 [useChatRestrictions] Verificando bloqueio global...');
      const { data: globalSettings, error: globalError } = await supabase
        .from('admin_settings')
        .select('chat_blocked_until')
        .eq('key', 'global_chat_settings')
        .maybeSingle();

      console.log('📊 [useChatRestrictions] Configurações globais:', globalSettings);
      if (globalError) {
        console.error('❌ [useChatRestrictions] Erro ao buscar configurações globais:', globalError);
      }

      if (globalSettings?.chat_blocked_until) {
        const blockUntil = new Date(globalSettings.chat_blocked_until);
        const isGloballyBlocked = blockUntil > currentTime;
        
        console.log(`⏰ [useChatRestrictions] Bloqueio global até: ${blockUntil.toISOString()}`);
        console.log(`⏰ [useChatRestrictions] Agora: ${currentTime.toISOString()}`);
        console.log(`🔒 [useChatRestrictions] É maior que agora? ${blockUntil.getTime()} > ${currentTime.getTime()} = ${isGloballyBlocked}`);
        
        if (isGloballyBlocked) {
          console.log('🚫 [useChatRestrictions] APLICANDO BLOQUEIO GLOBAL para usuário:', userId);
          setRestriction({
            isBlocked: true,
            reason: 'Chat bloqueado globalmente pelo administrador',
            blockedUntil: blockUntil
          });
          setLoading(false);
          return;
        } else {
          console.log('✅ [useChatRestrictions] Bloqueio global expirado');
        }
      } else {
        console.log('✅ [useChatRestrictions] Nenhum bloqueio global encontrado');
      }

      // ===== VERIFICAR BLOQUEIO ESPECÍFICO DO USUÁRIO =====
      console.log('👤 [useChatRestrictions] Verificando bloqueios específicos do usuário...');
      const { data: userRestrictions, error: userError } = await supabase
        .from('user_chat_restrictions')
        .select('id, blocked_until, reason, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (userError) {
        console.error('❌ [useChatRestrictions] Erro ao verificar restrições do usuário:', userError);
      }

      // Verificar se há alguma restrição ativa
      let activeUserRestriction = null;
      if (userRestrictions && userRestrictions.length > 0) {
        console.log(`📋 [useChatRestrictions] Encontradas ${userRestrictions.length} restrições do usuário`);
        for (const restriction of userRestrictions) {
          if (restriction.blocked_until) {
            const blockUntil = new Date(restriction.blocked_until);
            const isActive = blockUntil > currentTime;
            
            console.log(`📅 [useChatRestrictions] Restrição ${restriction.id}: até ${blockUntil.toISOString()}, ativa: ${isActive}`);
            
            if (isActive) {
              activeUserRestriction = restriction;
              break;
            }
          }
        }
      } else {
        console.log('✅ [useChatRestrictions] Nenhuma restrição específica encontrada');
      }

      if (activeUserRestriction) {
        const blockUntil = new Date(activeUserRestriction.blocked_until);
        console.log('🚫 [useChatRestrictions] APLICANDO BLOQUEIO ESPECÍFICO para usuário:', userId);
        setRestriction({
          isBlocked: true,
          reason: activeUserRestriction.reason || 'Você foi temporariamente bloqueado do chat',
          blockedUntil: blockUntil
        });
        setLoading(false);
        return;
      }

      // ===== NENHUM BLOQUEIO ATIVO =====
      console.log('✅ [useChatRestrictions] NENHUM BLOQUEIO ATIVO - Chat liberado para usuário:', userId);
      setRestriction({
        isBlocked: false,
        reason: null,
        blockedUntil: null
      });
    } catch (error) {
      console.error('💥 [useChatRestrictions] Erro ao verificar restrições:', error);
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
    console.log('🔄 [useChatRestrictions] useEffect executado - userId:', userId, 'roleLoading:', roleLoading);
    
    // Não executar se ainda está carregando roles
    if (roleLoading) {
      console.log('⏳ [useChatRestrictions] Aguardando carregamento de roles...');
      return;
    }
    
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
  }, [userId, roleLoading, isAdmin, isModerator, checkRestrictions]);

  return { restriction, loading, checkRestrictions };
};