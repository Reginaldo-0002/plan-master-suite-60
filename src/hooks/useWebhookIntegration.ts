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

    // Subscribe to webhook events that affect this user
    const channel = supabase
      .channel('webhook-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webhook_events',
          filter: `canonical_event->user_email=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 New webhook event received:', payload);
          const newEvent = payload.new as WebhookEvent;
          setWebhookEvents(prev => [newEvent, ...prev]);
          
          // Show notification for important events
          if (newEvent.canonical_event?.type === 'payment_succeeded') {
            toast({
              title: "Pagamento Confirmado! 🎉",
              description: `Seu plano ${newEvent.canonical_event.plan_slug?.toUpperCase()} foi ativado com sucesso!`,
              variant: "default",
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'webhook_events'
        },
        (payload) => {
          console.log('📝 Webhook event updated:', payload);
          const updatedEvent = payload.new as WebhookEvent;
          
          if (updatedEvent.status === 'processed' && updatedEvent.canonical_event?.type === 'payment_succeeded') {
            toast({
              title: "Plano Atualizado! ✅",
              description: "Seu perfil foi atualizado automaticamente. Recarregue a página para ver as mudanças.",
              variant: "default",
            });
            
            // Refresh the page after a delay to show updated plan
            setTimeout(() => {
              window.location.reload();
            }, 3000);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Webhook subscription status:', status);
        setIsListening(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
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