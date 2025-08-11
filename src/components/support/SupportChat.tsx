import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatbotOption {
  id: string;
  title: string;
  response: string;
}

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
}

export const SupportChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMode, setChatMode] = useState<'bot' | 'human' | 'ticket'>('bot');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [chatbotOptions, setChatbotOptions] = useState<ChatbotOption[]>([]);
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    description: "",
    priority: "normal" as const,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchChatbotConfig();
      initializeChat();
    }
  }, [isOpen]);

  const fetchChatbotConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'chatbot_config')
        .single();

      if (error) throw error;
      
      if (data?.value && typeof data.value === 'object' && 'menu_options' in data.value) {
        setChatbotOptions(data.value.menu_options as ChatbotOption[]);
      }
    } catch (error) {
      console.error('Error fetching chatbot config:', error);
    }
  };

  const initializeChat = () => {
    setMessages([{
      id: '1',
      type: 'bot',
      content: 'Olá! Como posso ajudá-lo hoje? Escolha uma das opções abaixo ou digite "atendente" para falar com um humano.',
      timestamp: new Date()
    }]);
  };

  const handleBotOptionSelect = (option: ChatbotOption) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: option.title,
      timestamp: new Date()
    };

    // Add bot response
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: option.response,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage, botMessage]);
  };

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Check if user wants human support
    if (currentMessage.toLowerCase().includes('atendente') || 
        currentMessage.toLowerCase().includes('humano')) {
      setChatMode('human');
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'Você foi direcionado para a fila de atendimento humano. Um de nossos atendentes irá responder em breve.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } else {
      // Simple bot response
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'Obrigado pela sua mensagem. Se não consegui ajudar, digite "atendente" para falar com nossa equipe.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }

    setCurrentMessage("");
  };

  const createTicket = async () => {
    if (!ticketForm.subject) {
      toast({
        title: "Erro",
        description: "Por favor, preencha o assunto",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para criar um ticket",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('support_tickets')
        .insert([{
          user_id: user.id,
          subject: ticketForm.subject,
          description: ticketForm.description,
          priority: ticketForm.priority,
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Ticket criado com sucesso! Nossa equipe irá respondê-lo em breve.",
      });

      setTicketForm({ subject: "", description: "", priority: "normal" });
      setChatMode('bot');
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar ticket",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>

      {/* Chat Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md h-[600px] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {chatMode === 'bot' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  {chatMode === 'bot' ? 'Assistente Virtual' : 
                   chatMode === 'human' ? 'Atendimento Humano' : 'Criar Ticket'}
                </DialogTitle>
                <DialogDescription>
                  {chatMode === 'bot' ? 'Como posso ajudá-lo?' : 
                   chatMode === 'human' ? 'Aguarde um atendente' : 'Descreva seu problema'}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {chatMode !== 'bot' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setChatMode('bot')}
                  >
                    Voltar ao Bot
                  </Button>
                )}
                {chatMode === 'human' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setChatMode('ticket')}
                  >
                    Criar Ticket
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {chatMode === 'ticket' ? (
            /* Ticket Form */
            <div className="flex-1 space-y-4 overflow-auto">
              <div>
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({...ticketForm, subject: e.target.value})}
                  placeholder="Descreva brevemente seu problema..."
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição Detalhada</Label>
                <Textarea
                  id="description"
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                  placeholder="Forneça mais detalhes sobre o problema..."
                  rows={6}
                />
              </div>
              
              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <select 
                  id="priority"
                  value={ticketForm.priority}
                  onChange={(e) => setTicketForm({...ticketForm, priority: e.target.value as any})}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="low">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              
              <Button onClick={createTicket} className="w-full">
                Criar Ticket
              </Button>
            </div>
          ) : (
            /* Chat Interface */
            <div className="flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-auto space-y-4 p-4 bg-gray-50 rounded-lg">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-white border'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bot Options */}
              {chatMode === 'bot' && chatbotOptions.length > 0 && (
                <div className="space-y-2 p-4 border-t">
                  <p className="text-sm font-medium">Opções rápidas:</p>
                  <div className="flex flex-wrap gap-2">
                    {chatbotOptions.map((option) => (
                      <Button
                        key={option.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleBotOptionSelect(option)}
                      >
                        {option.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="flex gap-2 p-4 border-t">
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {chatMode === 'human' && (
                <div className="p-4 bg-yellow-50 border-t">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Fila de Espera</Badge>
                    <span className="text-sm text-muted-foreground">
                      Você será atendido em breve...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};