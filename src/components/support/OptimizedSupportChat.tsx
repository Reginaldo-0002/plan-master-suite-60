
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send, User, Bot, X, AlertCircle, CheckCircle, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface OptimizedSupportChatProps {
  userId: string;
  userPlan: 'free' | 'vip' | 'pro';
}

interface Message {
  id: string;
  message: string;
  is_bot: boolean;
  created_at: string;
  sender_id: string;
}

interface ChatStatus {
  isOpen: boolean;
  inQueue: boolean;
  hasAdmin: boolean;
  queuePosition?: number;
  estimatedWait?: number;
}

export const OptimizedSupportChat = ({ userId, userPlan }: OptimizedSupportChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatStatus, setChatStatus] = useState<ChatStatus>({
    isOpen: false,
    inQueue: false,
    hasAdmin: false
  });
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (chatStatus.isOpen) {
      initializeChat();
      setupRealtimeUpdates();
    }
  }, [chatStatus.isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initializeChat = async () => {
    try {
      // Check if user has active chat session
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('session_status', 'active')
        .single();

      if (session) {
        await loadMessages();
        await checkQueueStatus();
      } else {
        await createNewSession();
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  };

  const setupRealtimeUpdates = () => {
    const channel = supabase
      .channel(`chat-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `sender_id=neq.${userId}`
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        
        if (!newMsg.is_bot) {
          toast({
            title: "Nova mensagem do suporte",
            description: "Um atendente respondeu sua mensagem",
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadMessages = async () => {
    try {
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select(`
          id,
          support_messages (*)
        `)
        .eq('user_id', userId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1);

      if (tickets && tickets[0]?.support_messages) {
        const sortedMessages = tickets[0].support_messages.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setMessages(sortedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const { data: session } = await supabase
        .from('chat_sessions')
        .insert([{
          user_id: userId,
          session_status: 'active',
          first_message_sent: false
        }])
        .select()
        .single();

      if (session) {
        await sendWelcomeMessage();
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const sendWelcomeMessage = async () => {
    const welcomeMessage = getPriorityWelcomeMessage();
    await addBotMessage(welcomeMessage);
  };

  const getPriorityWelcomeMessage = () => {
    const priorityInfo = {
      'pro': { priority: 'alta', time: '5-10 minutos' },
      'vip': { priority: 'normal', time: '10-15 minutos' },
      'free': { priority: 'baixa', time: '15-30 minutos' }
    };

    const info = priorityInfo[userPlan];
    return `Olá! Bem-vindo ao suporte prioritário ${userPlan.toUpperCase()}. Sua prioridade é ${info.priority} com tempo estimado de resposta: ${info.time}. Como posso ajudá-lo?`;
  };

  const addBotMessage = async (message: string) => {
    try {
      // Create or get ticket
      let ticketId;
      const { data: existingTicket } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'open')
        .single();

      if (existingTicket) {
        ticketId = existingTicket.id;
      } else {
        const { data: newTicket } = await supabase
          .from('support_tickets')
          .insert([{
            user_id: userId,
            subject: 'Chat de Suporte',
            description: 'Conversa iniciada via chat',
            priority: userPlan === 'pro' ? 'high' : userPlan === 'vip' ? 'normal' : 'low',
            status: 'open'
          }])
          .select()
          .single();
        
        ticketId = newTicket?.id;
      }

      const { data: botMessage } = await supabase
        .from('support_messages')
        .insert([{
          ticket_id: ticketId,
          sender_id: userId,
          message: message,
          is_bot: true,
          is_internal: false
        }])
        .select()
        .single();

      if (botMessage) {
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error adding bot message:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      // Get or create ticket
      let ticketId;
      const { data: existingTicket } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'open')
        .single();

      if (existingTicket) {
        ticketId = existingTicket.id;
      } else {
        const { data: newTicket } = await supabase
          .from('support_tickets')
          .insert([{
            user_id: userId,
            subject: 'Chat de Suporte',
            description: newMessage,
            priority: userPlan === 'pro' ? 'high' : userPlan === 'vip' ? 'normal' : 'low',
            status: 'open'
          }])
          .select()
          .single();
        
        ticketId = newTicket?.id;
      }

      // Send message
      const { data: userMessage } = await supabase
        .from('support_messages')
        .insert([{
          ticket_id: ticketId,
          sender_id: userId,
          message: newMessage,
          is_bot: false,
          is_internal: false
        }])
        .select()
        .single();

      if (userMessage) {
        setMessages(prev => [...prev, userMessage]);
        
        // Add to admin queue if first message
        if (messages.length === 1) {
          await addToAdminQueue();
        }
      }

      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addToAdminQueue = async () => {
    try {
      await supabase
        .from('admin_chat_queue')
        .insert([{
          user_id: userId,
          message: newMessage,
          status: 'pending',
          priority: userPlan === 'pro' ? 'high' : userPlan === 'vip' ? 'normal' : 'low'
        }]);

      setChatStatus(prev => ({ ...prev, inQueue: true }));
      await checkQueueStatus();
    } catch (error) {
      console.error('Error adding to queue:', error);
    }
  };

  const checkQueueStatus = async () => {
    try {
      const { data: queueItem } = await supabase
        .from('admin_chat_queue')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single();

      if (queueItem) {
        // Calculate queue position
        const { data: beforeUser } = await supabase
          .from('admin_chat_queue')
          .select('id')
          .eq('status', 'pending')
          .lt('created_at', queueItem.created_at);

        const position = (beforeUser?.length || 0) + 1;
        const estimatedWait = position * 5; // 5 minutes per person

        setChatStatus(prev => ({
          ...prev,
          inQueue: true,
          queuePosition: position,
          estimatedWait: estimatedWait
        }));
      }
    } catch (error) {
      console.error('Error checking queue status:', error);
    }
  };

  const getPriorityBadge = () => {
    const config = {
      'pro': { color: 'bg-purple-100 text-purple-800', label: 'PRO - Prioridade Alta' },
      'vip': { color: 'bg-blue-100 text-blue-800', label: 'VIP - Prioridade Normal' },
      'free': { color: 'bg-gray-100 text-gray-800', label: 'FREE - Prioridade Baixa' }
    };

    const { color, label } = config[userPlan];
    return <Badge className={color}>{label}</Badge>;
  };

  const getStatusIndicator = () => {
    if (chatStatus.hasAdmin) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">Atendente conectado</span>
        </div>
      );
    }

    if (chatStatus.inQueue) {
      return (
        <div className="flex items-center gap-2 text-yellow-600">
          <Clock className="w-4 h-4" />
          <span className="text-sm">
            Posição na fila: {chatStatus.queuePosition} | 
            Tempo estimado: {chatStatus.estimatedWait}min
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-gray-600">
        <Users className="w-4 h-4" />
        <span className="text-sm">Aguardando conexão</span>
      </div>
    );
  };

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={() => setChatStatus(prev => ({ ...prev, isOpen: true }))}
        className="fixed bottom-4 right-4 rounded-full w-14 h-14 shadow-lg z-50"
        size="lg"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>

      {/* Chat Dialog */}
      <Dialog 
        open={chatStatus.isOpen} 
        onOpenChange={(open) => setChatStatus(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="max-w-md max-h-[80vh] p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Suporte Inteligente
              </DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setChatStatus(prev => ({ ...prev, isOpen: false }))}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {getPriorityBadge()}
              {getStatusIndicator()}
            </div>
          </DialogHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.is_bot ? 'justify-start' : 'justify-end'
                )}
              >
                {message.is_bot && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] p-3 rounded-lg",
                    message.is_bot
                      ? 'bg-muted text-foreground'
                      : 'bg-primary text-primary-foreground'
                  )}
                >
                  <p className="text-sm">{message.message}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {new Date(message.created_at).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
                {!message.is_bot && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
                disabled={loading}
              />
              <Button 
                onClick={sendMessage} 
                disabled={loading || !newMessage.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
