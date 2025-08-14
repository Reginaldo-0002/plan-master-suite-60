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
      console.log('✅ [EnhancedChatbot] Carregadas', data?.length || 0, 'respostas do chatbot');
    } catch (error) {
      console.error('❌ [EnhancedChatbot] Erro ao carregar respostas do chatbot:', error);
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
    
    console.log('🔍 [EnhancedChatbot] Buscando resposta para:', normalizedInput);
    console.log('📊 [EnhancedChatbot] Total de respostas disponíveis:', chatbotResponses.length);
    
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
    
    if (response) {
      console.log('✅ [EnhancedChatbot] Resposta encontrada:', response.trigger_text, '→', response.response_type);
    } else {
      console.log('❌ [EnhancedChatbot] Nenhuma resposta encontrada para:', normalizedInput);
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
        const availableCommands = chatbotResponses
          .filter(r => r.priority >= 50) // Só comandos principais
          .slice(0, 5)
          .map(r => `• ${r.trigger_text} - ${r.title}`)
          .join('\n');
          
        const defaultMsg: Message = {
          id: `bot-default-${Date.now()}`,
          message: `Desculpe, não entendi sua solicitação. Você pode tentar reformular ou digitar "ola" para ver as opções disponíveis.

**Comandos disponíveis:**
${availableCommands || '• ola - Menu principal\n• planos - Nossos planos\n• suporte - Falar com suporte\n• contato - Informações de contato'}

Digite exatamente uma das palavras-chave acima para acessar o menu correspondente.`,
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
    <div className="fixed bottom-4 left-4 z-50 w-72 sm:w-80 max-w-[calc(100vw-2rem)]">
      <Card className="flex flex-col h-96 max-h-[80vh] shadow-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b px-3 py-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Bot className="w-4 h-4 text-primary flex-shrink-0" />
          <h3 className="font-semibold text-xs truncate">Assistente Virtual</h3>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expandir chat" : "Minimizar chat"}
            className="h-6 w-6 p-0"
          >
            <Minimize2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            title="Fechar chat"
            className="h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="flex flex-col flex-1 p-0 min-h-0 overflow-hidden">
          <ScrollArea className="flex-1 p-2 min-h-0">
            <div className="space-y-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-1 items-start w-full ${
                    message.is_bot ? 'justify-start' : 'justify-end'
                  }`}
                >
                  {message.is_bot && (
                    <Avatar className="w-5 h-5 flex-shrink-0 mt-0.5">
                      <AvatarFallback className="bg-primary/10 text-[10px]">
                        <Bot className="w-2.5 h-2.5 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`rounded-lg p-2 max-w-[85%] min-w-0 overflow-hidden ${
                      message.is_bot
                        ? 'bg-muted/50 text-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {message.is_bot && message.message_type !== 'text' ? (
                      <div className="w-full min-w-0">
                        <RichMessageRenderer
                          type={message.message_type}
                          message={message.message}
                          richContent={message.rich_content}
                          onButtonClick={handleButtonClick}
                          className="w-full min-w-0"
                        />
                      </div>
                    ) : (
                      <div className="text-xs leading-relaxed whitespace-pre-wrap break-words word-wrap-anywhere">
                        {message.message}
                      </div>
                    )}
                  </div>

                  {!message.is_bot && (
                    <Avatar className="w-5 h-5 flex-shrink-0 mt-0.5">
                      <AvatarFallback className="text-[10px]">
                        <User className="w-2.5 h-2.5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {botTyping && (
                <div className="flex gap-1 items-start">
                  <Avatar className="w-5 h-5 flex-shrink-0 mt-0.5">
                    <AvatarFallback className="bg-primary/10 text-[10px]">
                      <Bot className="w-2.5 h-2.5 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted/50 rounded-lg p-2 max-w-[85%]">
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce" />
                      <div className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce delay-100" />
                      <div className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-2 border-t bg-background">
            <div className="flex gap-1">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                disabled={loading}
                className="flex-1 text-xs h-8 min-w-0"
              />
              <Button
                onClick={handleSendMessage}
                disabled={loading || !newMessage.trim()}
                size="sm"
                className="h-8 px-2 flex-shrink-0"
              >
                <Send className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-center truncate">
              Digite "ola" para ver as opções disponíveis
            </p>
          </div>
        </CardContent>
      )}
    </Card>
    </div>
  );
};