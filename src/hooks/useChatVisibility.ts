import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChatVisibility {
  isHidden: boolean;
  reason: string | null;
  hiddenAt: Date | null;
}

export const useChatVisibility = (userId: string | undefined) => {
  const [visibility, setVisibility] = useState<ChatVisibility>({
    isHidden: false,
    reason: null,
    hiddenAt: null
  });
  const [loading, setLoading] = useState(true);

  const checkVisibility = useCallback(async () => {
    if (!userId) {
      setVisibility({
        isHidden: false,
        reason: null,
        hiddenAt: null
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_chat_visibility')
        .select('is_hidden, reason, hidden_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking chat visibility:', error);
        setVisibility({
          isHidden: false,
          reason: null,
          hiddenAt: null
        });
      } else if (data) {
        setVisibility({
          isHidden: data.is_hidden,
          reason: data.reason,
          hiddenAt: data.hidden_at ? new Date(data.hidden_at) : null
        });
      } else {
        // No record found, chat is visible by default
        setVisibility({
          isHidden: false,
          reason: null,
          hiddenAt: null
        });
      }
    } catch (error) {
      console.error('Error checking chat visibility:', error);
      setVisibility({
        isHidden: false,
        reason: null,
        hiddenAt: null
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkVisibility();

    if (!userId) return;

    // Real-time subscription para mudanças na visibilidade do chat
    const channel = supabase
      .channel(`chat-visibility-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_chat_visibility',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔄 Chat visibility change detected - rechecking...');
          setTimeout(checkVisibility, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, checkVisibility]);

  return { visibility, loading, checkVisibility };
};