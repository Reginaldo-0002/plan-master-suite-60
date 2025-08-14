import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, Bot, User, X, Minimize2, MessageCircle } from 'lucide-react';
import { RichMessageRenderer } from './RichMessageRenderer';

interface Message {
  id: string;
  message: string;
  message_type: 'text' | 'buttons' | 'image' | 'card' | 'link';
  rich_content?: any;
  sender_id: string;
  is_bot: boolean;
  created_at: string;
}

interface ChatbotResponse {
  id: string;
  trigger_text: string;
  response_type: string;
  title?: string;
  message: string;
  rich_content: any;
  priority: number;
}

interface EnhancedChatbotProps {
  userId?: string;
  ticketId?: string;
  onMessageSent?: (message: string) => void;
  onBotResponse?: (response: ChatbotResponse) => void;
  className?: string;
}

export const EnhancedChatbot: React.FC<EnhancedChatbotProps> = ({
  userId,
  ticketId,
  onMessageSent,
  onBotResponse,
  className = ''
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatbotResponses, setChatbotResponses] = useState<ChatbotResponse[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadChatbotResponses();
    if (ticketId) {
      loadMessages();
    }
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, botTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatbotResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_rich_responses')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;
      setChatbotResponses(data || []);
    } catch (error) {
      console.error('Error loading chatbot responses:', error);
    }
  };

  const loadMessages = async () => {
    if (!ticketId) return;

    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Transform data to match Message interface
      const transformedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        message: msg.message,
        message_type: (msg.message_type as 'text' | 'buttons' | 'image' | 'card' | 'link') || 'text',
        rich_content: msg.rich_content,
        sender_id: msg.sender_id,
        is_bot: msg.is_bot || false,
        created_at: msg.created_at
      }));
      
      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const findBotResponse = (userInput: string): ChatbotResponse | null => {
    const normalizedInput = userInput.toLowerCase().trim();
    
    // Busca por correspondência exata primeiro
    let response = chatbotResponses.find(r => 
      r.trigger_text.toLowerCase() === normalizedInput
    );
    
    // Se não encontrar, busca por correspondência parcial
    if (!response) {
      response = chatbotResponses.find(r => 
        normalizedInput.includes(r.trigger_text.toLowerCase()) ||
        r.trigger_text.toLowerCase().includes(normalizedInput)
      );
    }
    
    return response || null;
  };

  const saveMessage = async (
    message: string, 
    isBot: boolean, 
    messageType: string = 'text',
    richContent?: any
  ) => {
    if (!ticketId || !userId) return null;

    try {
      const { data, error } = await supabase
        .from('support_messages')
        .insert([{
          ticket_id: ticketId,
          sender_id: userId,
          message,
          is_bot: isBot,
          message_type: messageType,
          rich_content: richContent
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  const logAnalytics = async (
    triggerText: string, 
    responseId: string,
    interactionType: string,
    metadata?: any
  ) => {
    if (!userId) return;

    try {
      await supabase
        .from('chatbot_analytics')
        .insert([{
          user_id: userId,
          trigger_text: triggerText,
          response_id: responseId,
          interaction_type: interactionType,
          metadata: metadata || {}
        }]);
    } catch (error) {
      console.error('Error logging analytics:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || loading) return;

    const userMessage = newMessage.trim();
    setNewMessage('');
    setLoading(true);

    // Adicionar mensagem do usuário
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      message: userMessage,
      message_type: 'text',
      sender_id: userId || 'user',
      is_bot: false,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    onMessageSent?.(userMessage);

    // Salvar mensagem do usuário
    await saveMessage(userMessage, false);

    // Simular digitação do bot
    setBotTyping(true);
    
    setTimeout(async () => {
      setBotTyping(false);
      
      // Buscar resposta do bot
      const botResponse = findBotResponse(userMessage);
      
      if (botResponse) {
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          message: botResponse.message,
          message_type: botResponse.response_type as any,
          rich_content: botResponse.rich_content,
          sender_id: 'bot',
          is_bot: true,
          created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, botMsg]);
        onBotResponse?.(botResponse);

        // Salvar resposta do bot
        await saveMessage(
          botResponse.message, 
          true, 
          botResponse.response_type,
          botResponse.rich_content
        );

        // Log analytics
        await logAnalytics(
          userMessage,
          botResponse.id,
          'bot_response',
          { response_type: botResponse.response_type }
        );
      } else {
        // Resposta padrão quando não encontra correspondência
        const defaultMsg: Message = {
          id: `bot-default-${Date.now()}`,
          message: 'Desculpe, não entendi sua solicitação. Você pode tentar reformular ou digitar "ola" para ver as opções disponíveis.\n\nAlgumas palavras-chave que reconheço:\n• ola - Menu principal\n• planos - Nossos planos\n• suporte - Falar com suporte\n• contato - Informações de contato',
          message_type: 'text',
          sender_id: 'bot',
          is_bot: true,
          created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, defaultMsg]);
        await saveMessage(defaultMsg.message, true);
      }
      
      setLoading(false);
    }, 1000 + Math.random() * 1000); // Simular tempo de processamento variável
  };

  const handleButtonClick = async (value: string) => {
    if (!value) return;

    // Log analytics para clique em botão
    await logAnalytics(
      value,
      '',
      'button_click',
      { button_value: value }
    );

    // Tratar clique como uma nova mensagem
    setNewMessage(value);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Se não está aberto, mostrar apenas o botão
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 bg-secondary hover:bg-secondary/90 shadow-lg"
          title="Abrir assistente virtual"
        >
          <Bot className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80 h-96">
      <Card className="flex flex-col h-full shadow-xl">{/* Removed max-h-[600px] and className prop */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">Assistente Virtual</h3>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expandir chat" : "Minimizar chat"}
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            title="Fechar chat"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="flex flex-col flex-1 p-0">
          <ScrollArea className="flex-1 p-4 min-h-0">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 w-full ${
                    message.is_bot ? 'justify-start' : 'justify-end'
                  }`}
                >
                  {message.is_bot && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary/10">
                        <Bot className="w-4 h-4 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`w-full max-w-full rounded-lg p-3 ${
                      message.is_bot
                        ? 'bg-muted/50 text-foreground'
                        : 'bg-primary text-primary-foreground ml-auto'
                    }`}
                  >
                    {message.is_bot && message.message_type !== 'text' ? (
                      <div className="w-full max-w-full overflow-hidden">
                        <RichMessageRenderer
                          type={message.message_type}
                          message={message.message}
                          richContent={message.rich_content}
                          onButtonClick={handleButtonClick}
                          className="w-full max-w-full"
                        />
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap break-words w-full">
                        {message.message}
                      </div>
                    )}
                  </div>

                  {!message.is_bot && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {botTyping && (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/10">
                      <Bot className="w-4 h-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted/50 rounded-lg p-3 max-w-[80%]">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                disabled={loading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={loading || !newMessage.trim()}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Digite "ola" para ver as opções disponíveis
            </p>
          </div>
        </CardContent>
      )}
    </Card>
    </div>
  );
};