
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageCircle, X, Minimize2, Bot, Trash2 } from "lucide-react";
import { Profile } from "@/types/profile";
import { useChatRestrictions } from "@/hooks/useChatRestrictions";
import { useChatVisibility } from "@/hooks/useChatVisibility";
import { useRoleCheck } from "@/hooks/useRoleCheck";
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
  const { isAdmin, isModerator } = useRoleCheck();
  const { restriction, loading: restrictionLoading, checkRestrictions } = useChatRestrictions(profile?.user_id);
  const { visibility, loading: visibilityLoading } = useChatVisibility(profile?.user_id);

  // Debug logs para SupportChat
  console.log('🔍 [SupportChat] Componente renderizado para usuário:', profile?.user_id);
  console.log('🔒 [SupportChat] Restriction state:', restriction);
  console.log('👁️ [SupportChat] Visibility state:', visibility);
  console.log('⏳ [SupportChat] Loading states - restriction:', restrictionLoading, 'visibility:', visibilityLoading);
  console.log('👑 [SupportChat] User roles - Admin:', isAdmin, 'Moderator:', isModerator);

  // Forçar verificação de restrições quando o componente for aberto
  useEffect(() => {
    console.log('🔄 [SupportChat] Forçando verificação de restrições...');
    console.log('🔄 [SupportChat] Profile:', profile?.user_id);
    console.log('🔄 [SupportChat] checkRestrictions função:', !!checkRestrictions);
    
    if (checkRestrictions) {
      checkRestrictions();
    }
    
    if (isOpen && checkRestrictions) {
      console.log('🔄 [SupportChat] Chat aberto - forçando verificação de restrições');
      setTimeout(() => checkRestrictions(), 1000);
    }
  }, [isOpen, checkRestrictions, profile?.user_id]);

  useEffect(() => {
    if (isOpen && !ticketId) {
      createOrGetTicket();
      loadChatOptions();
    }
  }, [isOpen, profile?.user_id]);

  // Set up real-time subscription for new messages from admin
  useEffect(() => {
    if (!ticketId || !profile?.user_id) return;

    console.log('🔔 Setting up real-time subscription for ticket:', ticketId);

    const channel = supabase
      .channel(`ticket-messages-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          console.log('🔔 New message received via real-time:', payload);
          const newMessage = payload.new as Message;
          
          // Atualizar mensagens se não for do próprio usuário
          if (newMessage.sender_id !== profile.user_id) {
            console.log('🔔 Adding admin message to chat');
            setMessages(prev => [...prev, newMessage]);
            scrollToBottom();
          } else {
            console.log('🔔 Message from current user, skipping');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          console.log('🗑️ Message deleted via real-time:', payload);
          const deletedMessage = payload.old as Message;
          setMessages(prev => prev.filter(msg => msg.id !== deletedMessage.id));
        }
      )
      .subscribe((status) => {
        console.log('🔔 Real-time subscription status:', status);
      });

    return () => {
      console.log('🔔 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [ticketId, profile?.user_id]);

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
    console.log('🎯 handleOptionClick called - shouldBlock:', shouldBlockChat(), 'ticketId:', ticketId);
    if (!ticketId || shouldBlockChat()) {
      console.log('🚫 Option click blocked - ticketId:', ticketId, 'shouldBlock:', shouldBlockChat());
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
    console.log('🎯 sendMessage called - shouldBlock:', shouldBlockChat(), 'message:', newMessage.trim());
    if (!newMessage.trim() || !ticketId || loading || shouldBlockChat()) {
      console.log('🚫 Send message blocked - conditions:', {
        hasMessage: !!newMessage.trim(),
        hasTicket: !!ticketId,
        isLoading: loading,
        shouldBlock: shouldBlockChat()
      });
      return;
    }

    setLoading(true);
    const messageText = newMessage.trim();
    
    try {
      // Primeiro salvar a mensagem no ticket
      const { data: messageData, error } = await supabase
        .from('support_messages')
        .insert([
          {
            ticket_id: ticketId,
            sender_id: profile.user_id,
            message: messageText,
            is_bot: false
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Adicionar mensagem do usuário imediatamente
      setMessages(prev => [...prev, messageData]);
      setNewMessage("");
      setShowOptions(false);

      // Forward message to admin via edge function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('📤 Forwarding message to admin...');
        
        const response = await fetch('https://srnwogrjwhqjjyodxalx.supabase.co/functions/v1/admin-chat-handler', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({
            action: 'forward_to_admin',
            userId: profile.user_id,
            message: messageText,
            ticketId: ticketId,
            userProfile: {
              full_name: profile.full_name || 'Usuário',
              plan: profile.plan
            }
          })
        });

        if (!response.ok) {
          console.log('❌ Failed to forward to admin, but message was saved');
        } else {
          console.log('✅ Message forwarded to admin successfully');
        }
      } catch (forwardError) {
        console.error('❌ Error forwarding to admin:', forwardError);
      }

      // Resposta automática apenas para primeira mensagem
      if (messages.length === 1) { // Só mensagem de boas-vindas
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
      }

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

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('support_messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', profile.user_id);

      if (error) throw error;

      // Remover da lista local
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      toast({
        title: "Sucesso",
        description: "Mensagem apagada com sucesso",
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Erro",
        description: "Erro ao apagar mensagem",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // CRITICAL: Verificar se o chat deve ser bloqueado
  const shouldBlockChat = () => {
    // Admins e moderadores sempre têm acesso
    if (isAdmin || isModerator) {
      console.log('👑 [SupportChat] Admin/Moderator - chat sempre liberado');
      return false;
    }

    // Chat está bloqueado por restrições globais ou específicas
    if (restriction.isBlocked) {
      console.log('🚫 [SupportChat] Chat bloqueado por restrições:', restriction.reason);
      return true;
    }

    return false;
  };

  // Se o chat está oculto para este usuário, não mostrar o botão
  if (visibility.isHidden || visibilityLoading) {
    console.log('🚫 [SupportChat] Chat oculto por visibilidade');
    return null;
  }

  // Se o chat deve ser bloqueado, mostrar bloqueio
  if (shouldBlockChat() && !restrictionLoading) {
    console.log('🚫 [SupportChat] Chat bloqueado - mostrando countdown');
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <ChatBlockCountdown 
          blockedUntil={restriction.blockedUntil} 
          reason={restriction.reason}
        />
      </div>
    );
  }

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
                    <>
                      {console.log('🚫 CHAT BLOQUEADO - Restriction:', restriction)}
                      <ChatBlockCountdown 
                        blockedUntil={restriction.blockedUntil} 
                        reason={restriction.reason}
                      />
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                        <p className="text-sm text-red-600 font-medium">🚫 Chat Bloqueado Globalmente</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          DEBUG: UserID: {profile?.user_id?.slice(0, 8)}... | Blocked: {restriction.isBlocked.toString()}
                        </p>
                        {restriction.reason && (
                          <p className="text-xs text-red-600/80 mt-1">Motivo: {restriction.reason}</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {console.log('✅ CHAT LIBERADO - Restriction:', restriction)}
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
                        <p className="text-xs text-green-600">✅ Chat Liberado</p>
                        <p className="text-xs text-muted-foreground">Debug: User {profile?.user_id?.slice(0, 8)}...</p>
                      </div>
                    </>
                  )}
                  {messages.map((message) => {
                    const isUserMessage = message.sender_id === profile.user_id;
                    const isAdminMessage = !message.is_bot && message.sender_id !== profile.user_id && message.sender_id !== 'bot';
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex gap-2 mb-3 ${
                          isUserMessage ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {!isUserMessage && (
                          <Avatar className="w-6 h-6 flex-shrink-0">
                            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                              {isAdminMessage ? 'A' : 'S'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex flex-col max-w-[70%]">
                          <div
                            className={`rounded-lg p-3 text-sm relative group ${
                              isUserMessage
                                ? 'bg-primary text-primary-foreground ml-auto'
                                : isAdminMessage
                                ? 'bg-blue-500 text-white'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            {message.message}
                            {isUserMessage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                onClick={() => deleteMessage(message.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          <div className={`text-xs text-muted-foreground mt-1 ${
                            isUserMessage ? 'text-right' : 'text-left'
                          }`}>
                            {new Date(message.created_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            {isAdminMessage && ' • Admin'}
                          </div>
                        </div>
                        {isUserMessage && (
                          <Avatar className="w-6 h-6 flex-shrink-0">
                            <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                              U
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })}
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
                <div className="text-center py-4">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-sm text-red-600 font-medium mb-2">🚫 Não é possível enviar mensagens</p>
                    <ChatBlockCountdown 
                      blockedUntil={restriction.blockedUntil} 
                      reason={restriction.reason}
                    />
                  </div>
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
