import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatRestrictionState {
  isBlocked: boolean;
  blockReason: string | null;
  blockedUntil: Date | null;
}

export const useChatRestrictions = (userId?: string) => {
  const [restriction, setRestriction] = useState<ChatRestrictionState>({
    isBlocked: false,
    blockReason: null,
    blockedUntil: null
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    checkUserChatRestriction();
    setupRealtimeSubscription();

    // Verificar restrições periodicamente (a cada 10 segundos)
    const interval = setInterval(checkUserChatRestriction, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [userId]);

  const checkUserChatRestriction = async () => {
    if (!userId) return;

    try {
      console.log('Verificando restrições de chat para usuário:', userId);
      
      // Verificar bloqueio global
      const { data: globalSettings, error: globalError } = await supabase
        .from('admin_settings')
        .select('chat_blocked_until')
        .eq('key', 'global_chat_settings')
        .maybeSingle();

      if (globalError && globalError.code !== 'PGRST116') {
        console.error('Error checking global chat settings:', globalError);
      }

      if (globalSettings?.chat_blocked_until) {
        const blockUntil = new Date(globalSettings.chat_blocked_until);
        if (blockUntil > new Date()) {
          console.log('Chat bloqueado globalmente até:', blockUntil);
          setRestriction({
            isBlocked: true,
            blockReason: 'Chat bloqueado globalmente pelo administrador',
            blockedUntil: blockUntil
          });
          setLoading(false);
          return;
        }
      }

      // Verificar bloqueio específico do usuário - buscar o mais recente
      const { data: userRestriction, error: userError } = await supabase
        .from('user_chat_restrictions')
        .select('blocked_until, reason, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error checking user chat restrictions:', userError);
      }

      console.log('Restrição do usuário encontrada:', userRestriction);

      if (userRestriction?.blocked_until) {
        const blockUntil = new Date(userRestriction.blocked_until);
        const now = new Date();
        
        console.log('Verificando se usuário está bloqueado:', {
          blockUntil: blockUntil.toISOString(),
          now: now.toISOString(),
          isBlocked: blockUntil > now
        });

        if (blockUntil > now) {
          console.log('Usuário está bloqueado até:', blockUntil);
          setRestriction({
            isBlocked: true,
            blockReason: userRestriction.reason || 'Você foi temporariamente bloqueado do chat',
            blockedUntil: blockUntil
          });
          setLoading(false);
          return;
        } else {
          console.log('Bloqueio expirado');
        }
      }

      console.log('Usuário não está bloqueado');
      setRestriction({
        isBlocked: false,
        blockReason: null,
        blockedUntil: null
      });
    } catch (error) {
      console.error('Error checking chat restrictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!userId) return;

    console.log('Setting up real-time subscription for chat restrictions:', userId);

    const channel = supabase
      .channel('user-chat-restrictions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_chat_restrictions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Restrição de chat alterada via real-time:', payload);
          checkUserChatRestriction();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_settings',
          filter: `key=eq.global_chat_settings`
        },
        (payload) => {
          console.log('Configuração global de chat alterada via real-time:', payload);
          checkUserChatRestriction();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up chat restrictions subscription');
      supabase.removeChannel(channel);
    };
  };

  const checkBeforeAction = async () => {
    await checkUserChatRestriction();
    
    if (restriction.isBlocked) {
      toast({
        title: "Chat Bloqueado",
        description: restriction.blockReason || "Você não tem permissão para usar o chat no momento",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  return {
    ...restriction,
    loading,
    checkBeforeAction,
    refreshRestrictions: checkUserChatRestriction
  };
};