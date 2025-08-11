import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send, X, Plus, MinusCircle, User, Bot, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
}

interface ChatbotOption {
  id: string;
  title: string;
  response: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

interface TicketMessage {
  id: string;
  message: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    role: string;
  };
}

export const SupportChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'tickets' | 'create-ticket' | 'ticket-detail'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatbotOptions, setChatbotOptions] = useState<ChatbotOption[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [newTicketMessage, setNewTicketMessage] = useState("");
  const [newTicket, setNewTicket] = useState({
    subject: "",
    description: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent"
  });
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchChatbotOptions();
      fetchUserTickets();
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentView === 'chat' && messages.length === 0) {
      initializeChat();
    }
  }, [currentView]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, ticketMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchChatbotOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'chatbot_config')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.value && typeof data.value === 'object' && 'menu_options' in data.value) {
        // Safe type conversion
        const menuOptions = data.value.menu_options;
        if (Array.isArray(menuOptions)) {
          setChatbotOptions(menuOptions as ChatbotOption[]);
        }
      } else {
        // Default options if none configured
        setChatbotOptions([
          {
            id: "1",
            title: "Como alterar meu plano?",
            response: "Para alterar seu plano, acesse as configurações da sua conta e selecione a opção 'Alterar Plano'. Você pode fazer upgrade ou downgrade a qualquer momento."
          },
          {
            id: "2", 
            title: "Como funciona o programa de indicações?",
            response: "Nosso programa de indicações oferece 10% de comissão sobre todas as vendas de usuários que você indicar. As comissões são creditadas automaticamente e podem ser sacadas via PIX."
          },
          {
            id: "3",
            title: "Problemas técnicos",
            response: "Se você está enfrentando problemas técnicos, tente limpar o cache do navegador ou usar o modo incógnito. Se o problema persistir, abra um ticket de suporte."
          },
          {
            id: "4",
            title: "Falar com atendente",
            response: "Entendi que você precisa falar com um atendente. Vou te direcionar para criar um ticket de suporte onde nossa equipe poderá te ajudar de forma personalizada."
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching chatbot options:', error);
    }
  };

  const fetchUserTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type assertion to ensure proper typing
      const typedTickets = (data || []).map(ticket => ({
        ...ticket,
        status: ticket.status as 'open' | 'in_progress' | 'closed',
        priority: ticket.priority as 'low' | 'normal' | 'high' | 'urgent'
      }));
      
      setTickets(typedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select(`
          *,
          profiles(full_name, role)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Type assertion and null safety
      const typedMessages = (data || []).map(message => ({
        ...message,
        profiles: message.profiles ? {
          full_name: message.profiles.full_name || null,
          role: message.profiles.role || 'user'
        } : undefined
      }));
      
      setTicketMessages(typedMessages);
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
    }
  };

  const initializeChat = () => {
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      content: "Olá! 👋 Sou o assistente virtual da plataforma. Como posso te ajudar hoje?",
      isBot: true,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const sendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");

    // Simulate bot response
    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "Obrigado pela sua mensagem! Para melhor te ajudar, selecione uma das opções abaixo ou descreva seu problema com mais detalhes.",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  const selectChatbotOption = (option: ChatbotOption) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: option.title,
      isBot: false,
      timestamp: new Date()
    };

    const botResponse: ChatMessage = {
      id: (Date.now() + 1).toString(),
      content: option.response,
      isBot: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage, botResponse]);

    // If it's the "talk to agent" option, suggest creating a ticket
    if (option.title.toLowerCase().includes('atendente') || option.title.toLowerCase().includes('humano')) {
      setTimeout(() => {
        const ticketSuggestion: ChatMessage = {
          id: (Date.now() + 2).toString(),
          content: "Gostaria de abrir um ticket de suporte para falar diretamente com nossa equipe?",
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, ticketSuggestion]);
      }, 2000);
    }
  };

  const createTicket = async () => {
    if (!newTicket.subject.trim()) {
      toast({
        title: "Erro",
        description: "O assunto é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: newTicket.subject,
          description: newTicket.description || null,
          priority: newTicket.priority,
          status: 'open'
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Ticket criado com sucesso! Nossa equipe entrará em contato em breve.",
      });

      setNewTicket({ subject: "", description: "", priority: "normal" });
      setCurrentView('tickets');
      fetchUserTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar ticket. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTicketMessage = async () => {
    if (!selectedTicket || !newTicketMessage.trim()) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          message: newTicketMessage,
          is_internal: false
        });

      if (error) throw error;

      setNewTicketMessage("");
      fetchTicketMessages(selectedTicket.id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openTicketDetail = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    fetchTicketMessages(ticket.id);
    setCurrentView('ticket-detail');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 shadow-lg"
          size="lg"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-96 h-[600px] shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <CardTitle className="text-lg">
              {currentView === 'chat' ? 'Suporte - Chat' :
               currentView === 'tickets' ? 'Meus Tickets' :
               currentView === 'create-ticket' ? 'Novo Ticket' :
               'Detalhes do Ticket'}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {currentView !== 'chat' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('chat')}
              >
                Chat
              </Button>
            )}
            {currentView !== 'tickets' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('tickets')}
              >
                Tickets
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 h-[520px] flex flex-col">
          {currentView === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
                    <div className={`flex items-start gap-2 max-w-[80%] ${message.isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.isBot ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        {message.isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div className={`p-3 rounded-lg ${message.isBot ? 'bg-blue-50 text-blue-900' : 'bg-gray-100 text-gray-900'}`}>
                        <p className="text-sm">{message.content}</p>
                        <span className="text-xs text-muted-foreground">
                          {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {chatbotOptions.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Opções rápidas:</p>
                  <div className="space-y-2">
                    {chatbotOptions.map((option) => (
                      <Button
                        key={option.id}
                        variant="outline"
                        size="sm"
                        className="w-full text-left justify-start h-auto p-2"
                        onClick={() => selectChatbotOption(option)}
                      >
                        <span className="text-xs">{option.title}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button onClick={sendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setCurrentView('create-ticket')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Ticket
              </Button>
            </>
          )}

          {currentView === 'tickets' && (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Meus Tickets</h3>
                <Button
                  size="sm"
                  onClick={() => setCurrentView('create-ticket')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => openTicketDetail(ticket)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm">{ticket.subject}</h4>
                      <Badge className={getStatusBadgeColor(ticket.status)}>
                        {ticket.status === 'open' ? 'Aberto' : 
                         ticket.status === 'in_progress' ? 'Andamento' : 'Fechado'}
                      </Badge>
                    </div>
                    {ticket.description && (
                      <p className="text-xs text-muted-foreground mb-2 truncate">
                        {ticket.description}
                      </p>
                    )}
                    <div className="flex justify-between items-center">
                      <Badge className={getPriorityBadgeColor(ticket.priority)}>
                        {ticket.priority === 'urgent' ? 'Urgente' : 
                         ticket.priority === 'high' ? 'Alta' :
                         ticket.priority === 'normal' ? 'Normal' : 'Baixa'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'create-ticket' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Assunto *</Label>
                <Input
                  id="subject"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                  placeholder="Descreva brevemente o problema..."
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  placeholder="Descreva o problema em detalhes..."
                  rows={4}
                />
              </div>
              
              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <Select 
                  value={newTicket.priority} 
                  onValueChange={(value: any) => setNewTicket({...newTicket, priority: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={createTicket} 
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Criando...' : 'Criar Ticket'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentView('chat')}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {currentView === 'ticket-detail' && selectedTicket && (
            <div className="flex flex-col h-full">
              <div className="mb-4 p-3 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">{selectedTicket.subject}</h3>
                  <Badge className={getStatusBadgeColor(selectedTicket.status)}>
                    {selectedTicket.status === 'open' ? 'Aberto' : 
                     selectedTicket.status === 'in_progress' ? 'Andamento' : 'Fechado'}
                  </Badge>
                </div>
                {selectedTicket.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedTicket.description}
                  </p>
                )}
                <div className="flex justify-between items-center">
                  <Badge className={getPriorityBadgeColor(selectedTicket.priority)}>
                    {selectedTicket.priority === 'urgent' ? 'Urgente' : 
                     selectedTicket.priority === 'high' ? 'Alta' :
                     selectedTicket.priority === 'normal' ? 'Normal' : 'Baixa'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(selectedTicket.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {ticketMessages.map((message) => (
                  <div key={message.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {message.profiles?.full_name || "Usuário"}
                        </span>
                        {message.profiles?.role === 'admin' && (
                          <Badge variant="secondary">Admin</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm">{message.message}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {selectedTicket.status !== 'closed' && (
                <div className="space-y-2">
                  <Textarea
                    value={newTicketMessage}
                    onChange={(e) => setNewTicketMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    rows={3}
                  />
                  <Button 
                    onClick={sendTicketMessage} 
                    className="w-full"
                    disabled={isLoading}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isLoading ? 'Enviando...' : 'Enviar'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
