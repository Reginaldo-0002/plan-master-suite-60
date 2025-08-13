
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
import { MessageSquare, Plus, Edit2, Search, Clock, User, Send, Eye, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChatbotConfigManager } from "./ChatbotConfigManager";
import { AdminChatControl } from "./AdminChatControl";

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
  } | null;
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
  } | null;
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
      // First get tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      // Then get profiles separately to avoid relation errors
      const userIds = ticketsData?.map(ticket => ticket.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      // Combine the data
      const ticketsWithProfiles = (ticketsData || []).map(ticket => ({
        ...ticket,
        status: ticket.status as 'open' | 'in_progress' | 'closed',
        priority: ticket.priority as 'low' | 'normal' | 'high' | 'urgent',
        profiles: profilesData?.find(p => p.user_id === ticket.user_id) || null
      }));
      
      setTickets(ticketsWithProfiles);
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
      // First get messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Then get profiles separately
      const senderIds = messagesData?.map(message => message.sender_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .in('user_id', senderIds);

      // Combine the data
      const messagesWithProfiles = (messagesData || []).map(message => ({
        ...message,
        profiles: profilesData?.find(p => p.user_id === message.sender_id) || null
      }));
      
      setTicketMessages(messagesWithProfiles);
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
        const menuOptions = data.value.menu_options;
        if (Array.isArray(menuOptions)) {
          // Safe type conversion with validation
          const validOptions = menuOptions.filter((option: any) => 
            option && typeof option === 'object' && 
            typeof option.id === 'string' && 
            typeof option.title === 'string' && 
            typeof option.response === 'string'
          ).map((option: any) => ({
            id: option.id as string,
            title: option.title as string,
            response: option.response as string
          }));
          setChatbotConfig(validOptions);
        }
      } else {
        // Set default chatbot options
        const defaultOptions: ChatbotOption[] = [
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

  const deleteAdminMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('support_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Mensagem apagada com sucesso",
      });

      // Recarregar mensagens
      if (selectedTicket) {
        await fetchTicketMessages(selectedTicket.id);
      }
    } catch (error) {
      console.error('Error deleting admin message:', error);
      toast({
        title: "Erro",
        description: "Erro ao apagar mensagem",
        variant: "destructive",
      });
    }
  };

  const clearAllChatMessages = async () => {
    if (!selectedTicket) return;

    try {
      const { error } = await supabase
        .from('support_messages')
        .delete()
        .eq('ticket_id', selectedTicket.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Todas as mensagens foram apagadas",
      });

      // Limpar mensagens localmente
      setTicketMessages([]);
    } catch (error) {
      console.error('Error clearing all messages:', error);
      toast({
        title: "Erro",
        description: "Erro ao limpar todas as mensagens",
        variant: "destructive",
      });
    }
  };

  const sendTicketMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Primeiro verificar se o usuário está bloqueado
      const { data: restrictions, error: restrictionError } = await supabase
        .from('user_chat_restrictions')
        .select('*')
        .eq('user_id', selectedTicket.user_id)
        .order('created_at', { ascending: false });

      if (restrictionError) {
        console.error('Error checking restrictions:', restrictionError);
      }

      // Verificar se há bloqueio ativo
      const now = new Date();
      const activeRestriction = restrictions?.find(r => {
        if (!r.blocked_until) return false;
        return new Date(r.blocked_until) > now;
      });

      if (activeRestriction) {
        toast({
          title: "Usuário Bloqueado",
          description: `Este usuário está bloqueado até ${new Date(activeRestriction.blocked_until).toLocaleString('pt-BR')}`,
          variant: "destructive",
        });
        return;
      }

      console.log('💬 Admin sending message to user:', selectedTicket.user_id);

      // Inserir mensagem do admin
      const { data: messageData, error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          message: newMessage.trim(),
          is_internal: false,
          is_bot: false
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Admin message saved:', messageData);

      // Atualizar estado local
      setNewMessage("");
      
      // Recarregar mensagens para garantir sincronia
      await fetchTicketMessages(selectedTicket.id);
      
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

      // Convert to plain object for JSON storage
      const configValue = { 
        menu_options: updatedOptions.map(option => ({
          id: option.id,
          title: option.title,
          response: option.response
        }))
      };

      const { error } = await supabase
        .from('admin_settings')
        .update({ 
          value: configValue as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', '58b4980a-cb38-4468-a7d3-d741baff4c14');

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

      // Convert to plain object for JSON storage
      const configValue = { 
        menu_options: updatedOptions.map(option => ({
          id: option.id,
          title: option.title,
          response: option.response
        }))
      };

      const { error } = await supabase
        .from('admin_settings')
        .update({ 
          value: configValue as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', '58b4980a-cb38-4468-a7d3-d741baff4c14');

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
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Mensagens</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllChatMessages}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Limpar Chat
                    </Button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-3">
                    {ticketMessages.map((message) => {
                      const isAdminMessage = message.profiles?.role === 'admin';
                      
                      return (
                        <div key={message.id} className={`p-3 border rounded-lg relative group ${
                          isAdminMessage ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium text-sm">
                              {message.profiles?.full_name || "Usuário"}
                              {isAdminMessage && (
                                <Badge variant="secondary" className="ml-2">Admin</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-muted-foreground">
                                {new Date(message.created_at).toLocaleString('pt-BR')}
                              </div>
                              {isAdminMessage && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  onClick={() => deleteAdminMessage(message.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm">{message.message}</p>
                        </div>
                      );
                    })}
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

      {/* Chatbot & Chat Control Section */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-foreground">Configurações de Chat</h3>
        <ChatbotConfigManager />
        <AdminChatControl />
      </div>
    </div>
  );
};
