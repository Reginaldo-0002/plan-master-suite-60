
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
import { MessageSquare, Plus, Edit2, Search, Clock, User, Send, Eye, Trash2, UserX, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdvancedChatbotManager } from "./AdvancedChatbotManager";
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
  const [userVisibilityStates, setUserVisibilityStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Check for notification redirect on component mount
  useEffect(() => {
    const processNotificationRedirect = (eventData?: any) => {
      let notificationData = eventData;
      
      // If no event data, check sessionStorage
      if (!notificationData) {
        const storedData = sessionStorage.getItem('adminChatNotification');
        if (storedData) {
          try {
            notificationData = JSON.parse(storedData);
          } catch (error) {
            console.error('Error parsing notification data:', error);
            sessionStorage.removeItem('adminChatNotification');
            return;
          }
        }
      }
      
      console.log('🔄 Processing notification redirect...', {
        hasData: !!notificationData,
        ticketsLength: tickets.length,
        currentHash: window.location.hash,
        eventData: !!eventData
      });
      
      if (notificationData && tickets.length > 0) {
        try {
          const { userId, userName, ticketId, timestamp, forceOpen } = notificationData;
          
          // Check if notification is not too old (within 15 minutes) or force open
          const isRecent = forceOpen || (timestamp && (Date.now() - timestamp < 15 * 60 * 1000));
          
          if (!isRecent) {
            console.log('❌ Notification too old, ignoring...');
            sessionStorage.removeItem('adminChatNotification');
            return;
          }
          
          console.log('✅ Processing chat notification:', { userId, userName, ticketId });
          console.log('📋 Available tickets:', tickets.map(t => ({ 
            id: t.id, 
            subject: t.subject,
            user_id: t.user_id 
          })));
          
          // Find and select the ticket
          const ticket = tickets.find(t => t.id === ticketId);
          if (ticket) {
            console.log('🎯 Found ticket, opening chat:', ticket);
            setSelectedTicket(ticket);
            
            // Clear any previous dialog state and ensure clean state
            setIsTicketDialogOpen(false);
            
            // Open the ticket dialog with delay for proper mounting
            setTimeout(() => {
              console.log('📱 Opening ticket dialog...');
              setIsTicketDialogOpen(true);
              
              // Load messages for this ticket
              fetchTicketMessages(ticketId);
              
              // Scroll to bottom after dialog opens
              setTimeout(() => {
                const messagesContainer = document.querySelector('[data-messages-container]');
                if (messagesContainer) {
                  messagesContainer.scrollTop = messagesContainer.scrollHeight;
                  console.log('📜 Scrolled to bottom of messages');
                }
              }, 1000);
            }, 300);
            
            toast({
              title: "Chat Aberto! 💬",
              description: `Conversa com ${userName} aberta com sucesso!`,
            });
            
            // Clear the notification data from sessionStorage
            sessionStorage.removeItem('adminChatNotification');
            console.log('🧹 Notification data cleared from sessionStorage');
            
          } else {
            console.error('❌ Ticket not found:', ticketId);
            console.log('Available ticket IDs:', tickets.map(t => t.id));
            toast({
              title: "Erro",
              description: "Ticket não encontrado. Atualize a página e tente novamente.",
              variant: "destructive"
            });
            sessionStorage.removeItem('adminChatNotification');
          }
          
        } catch (error) {
          console.error('❌ Error processing notification data:', error);
          sessionStorage.removeItem('adminChatNotification');
          toast({
            title: "Erro",
            description: "Erro ao processar notificação",
            variant: "destructive"
          });
        }
      }
    };

    // Process redirect when tickets are loaded
    if (tickets.length > 0) {
      console.log('🎬 Tickets loaded, checking for notification...');
      processNotificationRedirect();
    }
    
    // Listen for custom event from notification click or dashboard
    const handleOpenAdminChat = (event: CustomEvent) => {
      console.log('🎯 Custom event received:', event.detail);
      processNotificationRedirect(event.detail);
    };
    
    window.addEventListener('openAdminChat', handleOpenAdminChat as EventListener);
    
    return () => {
      window.removeEventListener('openAdminChat', handleOpenAdminChat as EventListener);
    };
  }, [tickets, toast]);

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

      // Load visibility states for all users
      const ticketUserIds = ticketsWithProfiles.map(ticket => ticket.user_id);
      if (ticketUserIds.length > 0) {
        const { data: visibilityData } = await supabase
          .from('user_chat_visibility')
          .select('user_id, is_hidden')
          .in('user_id', ticketUserIds);

        const visibilityMap: Record<string, boolean> = {};
        visibilityData?.forEach(v => {
          visibilityMap[v.user_id] = v.is_hidden;
        });
        setUserVisibilityStates(visibilityMap);
      }
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

  const sendTicketMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');


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

  const clearTicketChat = async () => {
    if (!selectedTicket) return;

    try {
      // Usar função do banco de dados para apagar definitivamente
      const { error } = await supabase.rpc('admin_clear_chat_messages', {
        ticket_id_param: selectedTicket.id
      });

      if (error) throw error;

      // Limpar mensagens do estado local
      setTicketMessages([]);
      
      toast({
        title: "Sucesso",
        description: "Chat apagado definitivamente",
      });
      
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast({
        title: "Erro",
        description: "Erro ao apagar chat",
        variant: "destructive",
      });
    }
  };

  const toggleChatVisibility = async (userId: string, userName: string, shouldHide: boolean) => {
    const action = shouldHide ? 'ocultar' : 'liberar';
    if (!confirm(`Tem certeza que deseja ${action} o chat para o usuário "${userName}"?`)) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('admin_toggle_user_chat_visibility', {
        target_user_id: userId,
        hide_chat: shouldHide,
        hide_reason: shouldHide ? `Chat ocultado pelo administrador em ${new Date().toLocaleString('pt-BR')}` : null
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Chat ${shouldHide ? 'ocultado' : 'liberado'} para o usuário "${userName}"`,
      });

      // Atualizar estado local de visibilidade
      setUserVisibilityStates(prev => ({
        ...prev,
        [userId]: shouldHide
      }));

      // Recarregar lista de tickets
      fetchTickets();
      
    } catch (error) {
      console.error('Error toggling chat visibility:', error);
      toast({
        title: "Erro",
        description: `Erro ao ${action} chat`,
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja excluir PERMANENTEMENTE o usuário "${userName}"? Esta ação não pode ser desfeita e todos os dados do usuário serão apagados.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('admin_delete_user_completely', {
        target_user_id: userId
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Usuário "${userName}" foi excluído permanentemente do sistema`,
      });

      // Recarregar lista de tickets
      fetchTickets();
      
      // Fechar dialog se estava aberto para este usuário
      if (selectedTicket && selectedTicket.user_id === userId) {
        setIsTicketDialogOpen(false);
        setSelectedTicket(null);
      }
      
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir usuário",
        variant: "destructive",
      });
    }
  };

  const deleteAllTickets = async () => {
    if (!confirm('Tem certeza que deseja APAGAR TODOS OS TICKETS E MENSAGENS permanentemente? Esta ação não pode ser desfeita!')) {
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('admin_delete_all_tickets');

      if (error) throw error;

      // Type assertion para garantir que data tem as propriedades esperadas
      const result = data as { deleted_tickets: number; deleted_messages: number; message: string };

      toast({
        title: "Sucesso",
        description: `${result.deleted_tickets} tickets e ${result.deleted_messages} mensagens foram excluídos permanentemente`,
      });

      // Limpar estados locais
      setTickets([]);
      setTicketMessages([]);
      setSelectedTicket(null);
      setIsTicketDialogOpen(false);
      
      // Recarregar dados
      fetchTickets();
      
    } catch (error) {
      console.error('Error deleting all tickets:', error);
      toast({
        title: "Erro",
        description: "Erro ao apagar todos os tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg text-foreground">Tickets ({filteredTickets.length})</CardTitle>
              <CardDescription>
                Lista de todos os tickets de suporte
              </CardDescription>
            </div>
            <Button 
              onClick={deleteAllTickets}
              variant="destructive"
              size="sm"
              disabled={loading}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Apagar Todos os Tickets
            </Button>
          </div>
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
                     <div className="flex gap-2">
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => openTicketDialog(ticket)}
                       >
                         <Eye className="w-4 h-4" />
                       </Button>
                        {userVisibilityStates[ticket.user_id] ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleChatVisibility(ticket.user_id, ticket.profiles?.full_name || "Usuário", false)}
                            className="text-green-600 hover:text-green-700"
                            title="Liberar Chat"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleChatVisibility(ticket.user_id, ticket.profiles?.full_name || "Usuário", true)}
                            className="text-orange-600 hover:text-orange-700"
                            title="Ocultar Chat"
                          >
                            <EyeOff className="w-4 h-4" />
                          </Button>
                        )}
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => deleteUser(ticket.user_id, ticket.profiles?.full_name || "Usuário")}
                         className="text-red-600 hover:text-red-700"
                         title="Excluir Usuário"
                       >
                         <UserX className="w-4 h-4" />
                       </Button>
                     </div>
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
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Mensagens</h4>
                  <div className="flex gap-2">
                    {userVisibilityStates[selectedTicket.user_id] ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleChatVisibility(selectedTicket.user_id, selectedTicket.profiles?.full_name || "Usuário", false)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Liberar Chat
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleChatVisibility(selectedTicket.user_id, selectedTicket.profiles?.full_name || "Usuário", true)}
                        className="text-orange-600 hover:text-orange-700"
                      >
                        <EyeOff className="w-4 h-4 mr-2" />
                        Ocultar Chat
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearTicketChat}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Apagar Chat
                    </Button>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-3" data-messages-container>
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

      {/* Advanced Chatbot Manager Section */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-foreground">Chatbot Inteligente</h3>
        <AdvancedChatbotManager />
      </div>

      {/* Chat Control Section */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-foreground">Controle Global do Chat</h3>
        <AdminChatControl />
      </div>
    </div>
  );
};
