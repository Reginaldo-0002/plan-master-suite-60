import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WebhookEvent {
  id: string;
  provider: string;
  status: 'received' | 'processed' | 'failed' | 'discarded';
  canonical_event: any;
  processed_at: string | null;
  created_at: string;
}

export const useWebhookIntegration = (userId?: string) => {
  const [isListening, setIsListening] = useState(false);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    // Subscribe to profile updates for real-time plan changes  
    const profileChannel = supabase
      .channel('user-profile-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('👤 Profile updated via webhook:', payload);
          const updatedProfile = payload.new as any;
          
          // Check if plan was updated
          if (updatedProfile.plan && payload.old?.plan !== updatedProfile.plan) {
            toast({
              title: "🎉 Pagamento Confirmado!",
              description: `Seu plano foi atualizado para ${updatedProfile.plan.toUpperCase()}! Todas as funcionalidades já estão disponíveis.`,
              variant: "default",
            });
            
            // Force immediate update without page reload
            window.dispatchEvent(new CustomEvent('profile-updated', { 
              detail: { profile: updatedProfile } 
            }));
          }
          
          // Also notify about plan end date changes
          if (updatedProfile.plan_end_date && payload.old?.plan_end_date !== updatedProfile.plan_end_date) {
            console.log('📅 Plan end date updated:', updatedProfile.plan_end_date);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Profile subscription status:', status);
        setIsListening(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(profileChannel);
      setIsListening(false);
    };
  }, [userId, toast]);

  const fetchWebhookEvents = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('webhook_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setWebhookEvents(data || []);
    } catch (error) {
      console.error('Error fetching webhook events:', error);
    }
  };

  const processWebhookEvent = async (eventId: string) => {
    try {
      const { data, error } = await supabase.rpc('process_webhook_event', {
        event_id: eventId
      });

      if (error) throw error;
      
      toast({
        title: "Evento Processado",
        description: "O evento do webhook foi processado com sucesso.",
        variant: "default",
      });

      return data;
    } catch (error) {
      console.error('Error processing webhook event:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar evento do webhook.",
        variant: "destructive",
      });
    }
  };

  return {
    isListening,
    webhookEvents,
    fetchWebhookEvents,
    processWebhookEvent
  };
};