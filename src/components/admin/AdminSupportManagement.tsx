
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Plus, Edit2, Search, Clock, User, Send, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Ticket {
  id: string;
  user_id: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  subject: string;
  description: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
  };
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  profiles?: {
    full_name: string | null;
    role: string;
  };
}

interface ChatbotOption {
  id: string;
  title: string;
  response: string;
}

export const AdminSupportManagement = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [chatbotConfig, setChatbotConfig] = useState<ChatbotOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [newOption, setNewOption] = useState({ title: "", response: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();
    fetchChatbotConfig();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('support-management')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_tickets'
      }, () => {
        fetchTickets();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_messages'
      }, () => {
        if (selectedTicket) {
          fetchTicketMessages(selectedTicket.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          profiles!inner(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data || []) as Ticket[]);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select(`
          *,
          profiles!inner(full_name, role)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTicketMessages((data || []) as TicketMessage[]);
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar mensagens do ticket",
        variant: "destructive",
      });
    }
  };

  const fetchChatbotConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'chatbot_config')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.value && typeof data.value === 'object' && 'menu_options' in data.value) {
        setChatbotConfig(data.value.menu_options as ChatbotOption[]);
      } else {
        // Set default chatbot options
        const defaultOptions = [
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
          }
        ];
        setChatbotConfig(defaultOptions);
      }
    } catch (error) {
      console.error('Error fetching chatbot config:', error);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string, priority?: string) => {
    try {
      const updateData: any = { status };
      if (priority) updateData.priority = priority;

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Ticket atualizado com sucesso",
      });
      
      fetchTickets();
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar ticket",
        variant: "destructive",
      });
    }
  };

  const sendTicketMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          message: newMessage,
          is_internal: false
        });

      if (error) throw error;

      setNewMessage("");
      fetchTicketMessages(selectedTicket.id);
      
      toast({
        title: "Sucesso",
        description: "Mensagem enviada com sucesso",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem",
        variant: "destructive",
      });
    }
  };

  const addChatbotOption = async () => {
    if (!newOption.title || !newOption.response) {
      toast({
        title: "Erro",
        description: "Preencha título e resposta",
        variant: "destructive",
      });
      return;
    }

    try {
      const updatedOptions = [...chatbotConfig, {
        id: Date.now().toString(),
        ...newOption
      }];

      const { error } = await supabase
        .from('admin_settings')
        .upsert({ 
          key: 'chatbot_config',
          value: { menu_options: updatedOptions } as any
        });

      if (error) throw error;

      setChatbotConfig(updatedOptions);
      setNewOption({ title: "", response: "" });
      
      toast({
        title: "Sucesso",
        description: "Opção do chatbot adicionada",
      });
    } catch (error) {
      console.error('Error adding chatbot option:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar opção",
        variant: "destructive",
      });
    }
  };

  const removeChatbotOption = async (optionId: string) => {
    try {
      const updatedOptions = chatbotConfig.filter(option => option.id !== optionId);

      const { error } = await supabase
        .from('admin_settings')
        .upsert({ 
          key: 'chatbot_config',
          value: { menu_options: updatedOptions } as any
        });

      if (error) throw error;

      setChatbotConfig(updatedOptions);
      
      toast({
        title: "Sucesso",
        description: "Opção removida com sucesso",
      });
    } catch (error) {
      console.error('Error removing chatbot option:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover opção",
        variant: "destructive",
      });
    }
  };

  const openTicketDialog = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    fetchTicketMessages(ticket.id);
    setIsTicketDialogOpen(true);
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = !searchTerm || 
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

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

  const ticketStats = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    closed: tickets.filter(t => t.status === 'closed').length,
    urgent: tickets.filter(t => t.priority === 'urgent').length,
  };

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Suporte</h2>
          <p className="text-muted-foreground">
            Gerencie tickets de suporte e configure o chatbot
          </p>
        </div>
        <Button onClick={() => setIsConfigDialogOpen(true)}>
          <Edit2 className="w-4 h-4 mr-2" />
          Configurar Chatbot
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tickets Abertos
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {ticketStats.open}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Andamento
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {ticketStats.in_progress}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolvidos
            </CardTitle>
            <User className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {ticketStats.closed}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Urgentes
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {ticketStats.urgent}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por assunto ou usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Abertos</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="closed">Fechados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Tickets ({filteredTickets.length})</CardTitle>
          <CardDescription>
            Lista de todos os tickets de suporte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {ticket.profiles?.full_name || "Sem nome"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">{ticket.subject}</div>
                      {ticket.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {ticket.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={ticket.status} 
                      onValueChange={(value) => updateTicketStatus(ticket.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Aberto</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="closed">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={ticket.priority} 
                      onValueChange={(value) => updateTicketStatus(ticket.id, ticket.status, value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openTicketDialog(ticket)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ticket Details Dialog */}
      <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Ticket</DialogTitle>
            <DialogDescription>
              {selectedTicket?.subject}
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                <div>
                  <strong>Usuário:</strong> {selectedTicket.profiles?.full_name || "Sem nome"}
                </div>
                <div>
                  <strong>Status:</strong>
                  <Badge className={getStatusBadgeColor(selectedTicket.status)}>
                    {selectedTicket.status === 'open' ? 'Aberto' : 
                     selectedTicket.status === 'in_progress' ? 'Em Andamento' : 'Fechado'}
                  </Badge>
                </div>
                <div>
                  <strong>Prioridade:</strong>
                  <Badge className={getPriorityBadgeColor(selectedTicket.priority)}>
                    {selectedTicket.priority === 'urgent' ? 'Urgente' : 
                     selectedTicket.priority === 'high' ? 'Alta' :
                     selectedTicket.priority === 'normal' ? 'Normal' : 'Baixa'}
                  </Badge>
                </div>
                <div>
                  <strong>Criado em:</strong> {new Date(selectedTicket.created_at).toLocaleString('pt-BR')}
                </div>
              </div>

              {selectedTicket.description && (
                <div className="p-4 border rounded-lg">
                  <strong>Descrição:</strong>
                  <p className="mt-2 text-sm">{selectedTicket.description}</p>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-medium">Mensagens</h4>
                <div className="max-h-60 overflow-y-auto space-y-3">
                  {ticketMessages.map((message) => (
                    <div key={message.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-sm">
                          {message.profiles?.full_name || "Usuário"}
                          {message.profiles?.role === 'admin' && (
                            <Badge variant="secondary" className="ml-2">Admin</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <p className="text-sm">{message.message}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Nova mensagem</Label>
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua resposta..."
                    rows={3}
                  />
                  <Button onClick={sendTicketMessage} className="w-full">
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Resposta
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Chatbot Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Chatbot</DialogTitle>
            <DialogDescription>
              Gerencie as opções do menu do chatbot
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label>Opções Atuais</Label>
              <div className="space-y-3 mt-2 max-h-60 overflow-y-auto">
                {chatbotConfig.map((option) => (
                  <div key={option.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{option.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {option.response}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChatbotOption(option.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t pt-4">
              <Label>Adicionar Nova Opção</Label>
              <div className="space-y-3 mt-2">
                <Input
                  placeholder="Título da opção..."
                  value={newOption.title}
                  onChange={(e) => setNewOption({...newOption, title: e.target.value})}
                />
                <Textarea
                  placeholder="Resposta do chatbot..."
                  value={newOption.response}
                  onChange={(e) => setNewOption({...newOption, response: e.target.value})}
                  rows={3}
                />
                <Button onClick={addChatbotOption} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Opção
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
