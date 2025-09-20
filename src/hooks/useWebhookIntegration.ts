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
  verified: boolean;
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

    // Subscribe to webhook events for automatic processing
    const webhookChannel = supabase
      .channel('webhook-events-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webhook_events'
        },
        async (payload) => {
          console.log('🎣 New webhook event received:', payload);
          const event = payload.new as any;
          
          // Automatically process if it's a payment-related event (extra safety)
          if ((event.provider === 'kiwify' || event.provider === 'hotmart' || event.provider === 'generic') && event.status === 'received') {
            console.log('🔄 Auto-processing webhook event:', event.id);
            
            setTimeout(async () => {
              try {
                const { data, error } = await supabase.rpc('process_webhook_event', {
                  event_id: event.id
                });
                
                if (error) {
                  console.error('❌ Auto-processing failed:', error);
                } else {
                  console.log('✅ Auto-processing successful:', data);
                }
              } catch (error) {
                console.error('❌ Error in auto-processing:', error);
              }
            }, 1000);
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
        async (payload) => {
          const updated = payload.new as any;
          if (updated?.status === 'processed' && userId) {
            console.log('📬 Webhook event processed, refreshing profile:', updated.id);
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

              if (profile) {
                window.dispatchEvent(new CustomEvent('profile-updated', { detail: { profile } }));
                toast({
                  title: 'Plano atualizado',
                  description: `Seu plano agora é ${profile.plan?.toUpperCase()}.`,
                });
              }
            } catch (err) {
              console.error('Erro buscando perfil após processamento do webhook:', err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(webhookChannel);
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