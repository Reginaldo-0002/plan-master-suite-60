
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send, User, Bot, X, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatSession {
  id: string;
  user_id: string;
  session_status: string;
  first_message_sent: boolean;
  last_activity: string;
  context_data: any;
  created_at: string;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_bot: boolean;
  is_internal: boolean;
  created_at: string;
}

interface SupportOption {
  id: string;
  title: string;
  description: string;
  category: string;
}

interface IntelligentSupportChatProps {
  userId: string;
  userPlan: 'free' | 'vip' | 'pro';
}

const SUPPORT_OPTIONS: SupportOption[] = [
  {
    id: 'billing',
    title: 'Problemas de Cobrança',
    description: 'Dúvidas sobre pagamentos, faturas ou planos',
    category: 'billing'
  },
  {
    id: 'technical',
    title: 'Suporte Técnico',
    description: 'Problemas técnicos, bugs ou funcionalidades',
    category: 'technical'
  },
  {
    id: 'account',
    title: 'Conta e Perfil',
    description: 'Alterações de dados, senha ou configurações',
    category: 'account'
  },
  {
    id: 'content',
    title: 'Conteúdo e Cursos',
    description: 'Dúvidas sobre materiais, vídeos ou acesso',
    category: 'content'
  },
  {
    id: 'other',
    title: 'Outros Assuntos',
    description: 'Outras dúvidas ou sugestões',
    category: 'general'
  }
];

export const IntelligentSupportChat = ({ userId, userPlan }: IntelligentSupportChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedOption, setSelectedOption] = useState<SupportOption | null>(null);
  const [isInAdminQueue, setIsInAdminQueue] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      initializeChat();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initializeChat = async () => {
    try {
      // Check for existing chat session
      const { data: existingSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('session_status', 'active')
        .single();

      if (sessionError && sessionError.code !== 'PGRST116') {
        throw sessionError;
      }

      if (existingSession) {
        setChatSession(existingSession);
        await fetchMessages(existingSession.id);
        
        // Check if user is in admin queue
        const { data: queueItem } = await supabase
          .from('admin_chat_queue')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .single();

        setIsInAdminQueue(!!queueItem);
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('chat_sessions')
          .insert([{
            user_id: userId,
            session_status: 'active',
            first_message_sent: false,
            context_data: {}
          }])
          .select()
          .single();

        if (createError) throw createError;
        setChatSession(newSession);
        
        // Send welcome message
        await sendBotMessage(newSession.id, 
          "Olá! Bem-vindo ao suporte. Como posso ajudá-lo hoje?");
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast({
        title: "Erro",
        description: "Erro ao inicializar chat",
        variant: "destructive",
      });
    }
  };

  const fetchMessages = async (sessionId: string) => {
    try {
      // For this component, we'll fetch from support_tickets/messages
      // This is a simplified version - in real implementation you'd need proper ticket management
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select(`
          id,
          support_messages (
            id,
            sender_id,
            message,
            is_bot,
            is_internal,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (tickets && tickets[0] && tickets[0].support_messages) {
        setMessages(tickets[0].support_messages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ));
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendBotMessage = async (sessionId: string, message: string) => {
    try {
      // Create or get support ticket
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
        const { data: newTicket, error: ticketError } = await supabase
          .from('support_tickets')
          .insert([{
            user_id: userId,
            subject: 'Chat de Suporte',
            description: 'Conversa iniciada via chat',
            priority: 'normal',
            status: 'open'
          }])
          .select()
          .single();

        if (ticketError) throw ticketError;
        ticketId = newTicket.id;
      }

      // Send bot message
      const { data: botMessage, error: messageError } = await supabase
        .from('support_messages')
        .insert([{
          ticket_id: ticketId,
          sender_id: userId, // Bot messages use system user
          message: message,
          is_bot: true,
          is_internal: false
        }])
        .select()
        .single();

      if (messageError) throw messageError;

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending bot message:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatSession) return;

    setLoading(true);
    try {
      // Update session to mark first message sent
      if (!chatSession.first_message_sent) {
        await supabase
          .from('chat_sessions')
          .update({ first_message_sent: true })
          .eq('id', chatSession.id);

        setChatSession({ ...chatSession, first_message_sent: true });

        // Send initial response with options
        await sendBotMessage(chatSession.id, 
          "Obrigado pela sua mensagem! Para melhor te ajudar, selecione uma das opções abaixo ou descreva seu problema com mais detalhes.");
        
        setShowOptions(true);
      } else {
        // Check if user already selected an option or is in admin queue
        if (!selectedOption && !isInAdminQueue) {
          // Forward to admin queue
          await forwardToAdminQueue(newMessage);
        } else {
          // Handle normal conversation
          await sendUserMessage(newMessage);
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

  const sendUserMessage = async (message: string) => {
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
        const { data: newTicket, error: ticketError } = await supabase
          .from('support_tickets')
          .insert([{
            user_id: userId,
            subject: selectedOption?.title || 'Chat de Suporte',
            description: message,
            priority: 'normal',
            status: 'open'
          }])
          .select()
          .single();

        if (ticketError) throw ticketError;
        ticketId = newTicket.id;
      }

      // Send user message
      const { data: userMessage, error: messageError } = await supabase
        .from('support_messages')
        .insert([{
          ticket_id: ticketId,
          sender_id: userId,
          message: message,
          is_bot: false,
          is_internal: false
        }])
        .select()
        .single();

      if (messageError) throw messageError;

      setMessages(prev => [...prev, userMessage]);
    } catch (error) {
      console.error('Error sending user message:', error);
    }
  };

  const forwardToAdminQueue = async (message: string) => {
    try {
      const { error } = await supabase
        .from('admin_chat_queue')
        .insert([{
          user_id: userId,
          chat_session_id: chatSession!.id,
          message: message,
          status: 'pending',
          priority: userPlan === 'pro' ? 'high' : userPlan === 'vip' ? 'normal' : 'low'
        }]);

      if (error) throw error;

      setIsInAdminQueue(true);
      
      await sendBotMessage(chatSession!.id, 
        "Sua mensagem foi encaminhada para nossa equipe de suporte. Um atendente entrará em contato em breve!");

      toast({
        title: "Mensagem Encaminhada",
        description: "Sua mensagem foi enviada para o suporte",
      });
    } catch (error) {
      console.error('Error forwarding to admin queue:', error);
    }
  };

  const selectOption = async (option: SupportOption) => {
    setSelectedOption(option);
    setShowOptions(false);
    
    await sendBotMessage(chatSession!.id, 
      `Entendi que você precisa de ajuda com: ${option.title}. Por favor, descreva seu problema em detalhes para que possamos ajudá-lo melhor.`);
  };

  const closeChat = () => {
    setIsOpen(false);
    setMessages([]);
    setShowOptions(false);
    setSelectedOption(null);
    setIsInAdminQueue(false);
  };

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 rounded-full w-14 h-14 shadow-lg z-50"
        size="lg"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>

      {/* Chat Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[80vh] p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Suporte
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={closeChat}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            {isInAdminQueue && (
              <Badge className="bg-yellow-100 text-yellow-800 w-fit">
                <AlertCircle className="w-3 h-3 mr-1" />
                Aguardando atendimento
              </Badge>
            )}
          </DialogHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.is_bot ? 'justify-start' : 'justify-end'
                }`}
              >
                {message.is_bot && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.is_bot
                      ? 'bg-muted text-foreground'
                      : 'bg-primary text-primary-foreground'
                  }`}
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

            {/* Support Options */}
            {showOptions && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Selecione uma categoria:</p>
                {SUPPORT_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    variant="outline"
                    className="w-full text-left justify-start p-3 h-auto"
                    onClick={() => selectOption(option)}
                  >
                    <div>
                      <div className="font-medium">{option.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={loading}
              />
              <Button onClick={sendMessage} disabled={loading || !newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
