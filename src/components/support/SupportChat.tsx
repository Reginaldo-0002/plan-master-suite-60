
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageCircle, X, Minimize2, Bot } from "lucide-react";
import { Profile } from "@/types/profile";
import { useChatRestrictions } from "@/hooks/useChatRestrictions";
import { ChatBlockCountdown } from "./ChatBlockCountdown";

interface Message {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  is_bot: boolean;
}

interface ChatOption {
  id: string;
  text: string;
  response: string;
}

interface SupportChatProps {
  profile?: Profile;
}

export const SupportChat = ({ profile }: SupportChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [chatOptions, setChatOptions] = useState<ChatOption[]>([]);
  const [showOptions, setShowOptions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { restriction, loading: restrictionLoading } = useChatRestrictions(profile?.user_id);

  useEffect(() => {
    console.log('🎯 [SUPPORT CHAT] useEffect triggered - Chat opened:', isOpen, 'Ticket ID:', ticketId, 'User ID:', profile?.user_id);
    console.log('🎯 [SUPPORT CHAT] Profile object:', profile);
    console.log('🎯 [SUPPORT CHAT] Current restriction state:', restriction);
    console.log('🎯 [SUPPORT CHAT] Restriction loading state:', restrictionLoading);
    
    if (isOpen && !ticketId) {
      createOrGetTicket();
      loadChatOptions();
    }
  }, [isOpen, profile?.user_id, restriction]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };


  const loadChatOptions = async () => {
    try {
      console.log('Loading chat options from admin settings...');
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'chatbot_config')
        .maybeSingle();

      if (error) {
        console.error('Error loading chat options:', error);
        // Use default options on error
        setDefaultChatOptions();
        return;
      }

      console.log('Admin settings response:', data);

      if (data?.value && typeof data.value === 'object') {
        // Parse the chatbot config properly
        const config = data.value as any;
        console.log('Parsed config:', config);
        
        if (config.menu_options && Array.isArray(config.menu_options)) {
          const formattedOptions = config.menu_options.map((option: any) => ({
            id: option.id,
            text: option.title,
            response: option.response
          }));
          console.log('Setting chat options:', formattedOptions);
          setChatOptions(formattedOptions);
        } else {
          console.log('No menu_options found, using defaults');
          setDefaultChatOptions();
        }
      } else {
        console.log('No chatbot config found, using defaults');
        setDefaultChatOptions();
      }
    } catch (error) {
      console.error('Error loading chat options:', error);
      setDefaultChatOptions();
    }
  };

  const setDefaultChatOptions = () => {
    const defaultOptions = [
      {
        id: '1',
        text: 'Como funciona o programa de afiliados?',
        response: 'Nosso programa de afiliados permite que você ganhe comissões indicando novos usuários. A cada venda realizada por seus indicados, você recebe uma porcentagem. É fácil e rentável!'
      },
      {
        id: '2', 
        text: 'Como posso fazer upgrade do meu plano?',
        response: 'Para fazer upgrade, acesse as configurações do seu perfil e selecione o plano desejado. O upgrade é imediato e você terá acesso a todos os recursos premium.'
      },
      {
        id: '3',
        text: 'Preciso de ajuda técnica',
        response: 'Nossa equipe de suporte técnico está aqui para ajudar! Descreva seu problema que um especialista responderá em breve.'
      },
      {
        id: '4',
        text: 'Informações sobre pagamento',
        response: 'Aceitamos diversos métodos de pagamento incluindo cartão de crédito, PIX e boleto. Todos os pagamentos são seguros e processados imediatamente.'
      }
    ];
    console.log('Setting default chat options:', defaultOptions);
    setChatOptions(defaultOptions);
  };

  const createOrGetTicket = async () => {
    try {
      // Primeiro, verificar se já existe um ticket aberto
      const { data: existingTickets, error: fetchError } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', profile?.user_id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      if (existingTickets && existingTickets.length > 0) {
        setTicketId(existingTickets[0].id);
        await loadMessages(existingTickets[0].id);
        console.log('Found existing ticket, setting showOptions to true');
        setShowOptions(true);
      } else {
        // Criar novo ticket
        const { data: newTicket, error: createError } = await supabase
          .from('support_tickets')
          .insert([
            {
              user_id: profile?.user_id,
              subject: 'Chat de Suporte',
              description: 'Conversa iniciada pelo chat',
              status: 'open',
              priority: 'normal'
            }
          ])
          .select()
          .single();

        if (createError) throw createError;
        
        setTicketId(newTicket.id);
        
        // Adicionar mensagem de boas-vindas
        const welcomeMessage = {
          id: 'welcome',
          message: 'Olá! Como posso ajudá-lo hoje? Escolha uma das opções abaixo ou digite sua pergunta:',
          sender_id: 'bot',
          created_at: new Date().toISOString(),
          is_bot: true
        };
        setMessages([welcomeMessage]);
        console.log('Setting showOptions to true for new ticket');
        setShowOptions(true);
      }
    } catch (error) {
      console.error('Error creating/getting ticket:', error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar chat de suporte",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async (ticketId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(messagesData || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleOptionClick = async (option: ChatOption) => {
    console.log('🎯 handleOptionClick called - isBlocked:', restriction.isBlocked, 'ticketId:', ticketId);
    if (!ticketId || restriction.isBlocked) {
      console.log('🚫 Option click blocked - ticketId:', ticketId, 'isBlocked:', restriction.isBlocked);
      return;
    }

    setShowOptions(false);
    setLoading(true);

    try {
      // Add user's option selection as a message
      const { data: userMessage, error: userError } = await supabase
        .from('support_messages')
        .insert([
          {
            ticket_id: ticketId,
            sender_id: profile.user_id,
            message: option.text,
            is_bot: false
          }
        ])
        .select()
        .single();

      if (userError) throw userError;

      setMessages(prev => [...prev, userMessage]);

      // Add bot response
      setTimeout(async () => {
        const botResponse = {
          id: `bot-${Date.now()}`,
          message: option.response,
          sender_id: 'bot',
          created_at: new Date().toISOString(),
          is_bot: true
        };
        setMessages(prev => [...prev, botResponse]);
        setLoading(false);
      }, 1000);

    } catch (error) {
      console.error('Error handling option click:', error);
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    console.log('🎯 sendMessage called - isBlocked:', restriction.isBlocked, 'message:', newMessage.trim());
    if (!newMessage.trim() || !ticketId || loading || restriction.isBlocked) {
      console.log('🚫 Send message blocked - conditions:', {
        hasMessage: !!newMessage.trim(),
        hasTicket: !!ticketId,
        isLoading: loading,
        isBlocked: restriction.isBlocked
      });
      return;
    }

    setLoading(true);
    try {
      const { data: messageData, error } = await supabase
        .from('support_messages')
        .insert([
          {
            ticket_id: ticketId,
            sender_id: profile.user_id,
            message: newMessage.trim(),
            is_bot: false
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, messageData]);
      setNewMessage("");
      setShowOptions(false);

      // Simular resposta automática após 1 segundo
      setTimeout(() => {
        const autoReply = {
          id: `auto-${Date.now()}`,
          message: 'Recebemos sua mensagem! Um de nossos atendentes responderá em breve.',
          sender_id: 'bot',
          created_at: new Date().toISOString(),
          is_bot: true
        };
        setMessages(prev => [...prev, autoReply]);
      }, 1000);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 shadow-lg"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-80 ${isMinimized ? 'h-12' : 'h-96'} transition-all duration-300`}>
      <Card className="h-full flex flex-col shadow-xl">
        <CardHeader className="p-3 border-b cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <CardTitle className="text-sm">Suporte</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                }}
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-64 p-3">
                <div className="space-y-3">
                  {restriction.isBlocked ? (
                    <ChatBlockCountdown 
                      blockedUntil={restriction.blockedUntil!} 
                      reason={restriction.reason}
                    />
                  ) : (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
                      <p className="text-xs text-green-600">✅ Chat Liberado</p>
                    </div>
                  )}
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-2 ${
                        message.sender_id === profile.user_id || !message.is_bot
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      {(message.is_bot || message.sender_id !== profile.user_id) && (
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            S
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[70%] rounded-lg p-2 text-sm ${
                          message.sender_id === profile.user_id || !message.is_bot
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {message.message}
                      </div>
                    </div>
                  ))}
                  {showOptions && chatOptions.length > 0 && !restriction.isBlocked && (
                    <div className="space-y-2 mt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Bot className="w-4 h-4" />
                        <span>Opções rápidas:</span>
                        <span className="text-xs">({chatOptions.length} opções)</span>
                      </div>
                      {chatOptions.map((option) => (
                        <Button
                          key={option.id}
                          variant="outline"
                          size="sm"
                          className="w-full text-left justify-start text-wrap h-auto py-2 px-3"
                          onClick={() => handleOptionClick(option)}
                          disabled={loading || restriction.isBlocked}
                        >
                          {option.text}
                        </Button>
                      ))}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>

            <div className="p-3 border-t">
              {restriction.isBlocked ? (
                <div className="text-center py-2">
                  <ChatBlockCountdown 
                    blockedUntil={restriction.blockedUntil!} 
                    reason={restriction.reason}
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    className="text-sm"
                    disabled={loading || restriction.isBlocked}
                  />
                  <Button
                    onClick={sendMessage}
                    size="sm"
                    disabled={loading || !newMessage.trim() || restriction.isBlocked}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
