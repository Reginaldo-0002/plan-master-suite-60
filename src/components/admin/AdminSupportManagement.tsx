import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Plus, Edit2, Search, Clock, User } from "lucide-react";
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
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
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

  const fetchChatbotConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'chatbot_config')
        .single();

      if (error) throw error;
      
      if (data?.value && typeof data.value === 'object' && 'menu_options' in data.value) {
        setChatbotConfig(data.value.menu_options as ChatbotOption[]);
      }
    } catch (error) {
      console.error('Error fetching chatbot config:', error);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status do ticket atualizado",
      });
      
      fetchTickets();
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar ticket",
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
        .update({ 
          value: { menu_options: updatedOptions }
        })
        .eq('key', 'chatbot_config');

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

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = !searchTerm || 
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tickets Abertos
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {tickets.filter(t => t.status === 'open').length}
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
              {tickets.filter(t => t.status === 'in_progress').length}
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
              {tickets.filter(t => t.status === 'closed').length}
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
                placeholder="Buscar por assunto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="open">Abertos</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="closed">Fechados</SelectItem>
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
                    <Badge className={getStatusBadgeColor(ticket.status)}>
                      {ticket.status === 'open' ? 'Aberto' : 
                       ticket.status === 'in_progress' ? 'Em Andamento' : 'Fechado'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityBadgeColor(ticket.priority)}>
                      {ticket.priority === 'urgent' ? 'Urgente' : 
                       ticket.priority === 'high' ? 'Alta' :
                       ticket.priority === 'normal' ? 'Normal' : 'Baixa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Chatbot Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Chatbot</DialogTitle>
            <DialogDescription>
              Gerencie as opções do menu do chatbot
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Opções Atuais</Label>
              <div className="space-y-2 mt-2">
                {chatbotConfig.map((option, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="font-medium">{option.title}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {option.response}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t pt-4">
              <Label>Adicionar Nova Opção</Label>
              <div className="space-y-2 mt-2">
                <Input
                  placeholder="Título da opção..."
                  value={newOption.title}
                  onChange={(e) => setNewOption({...newOption, title: e.target.value})}
                />
                <Textarea
                  placeholder="Resposta do chatbot..."
                  value={newOption.response}
                  onChange={(e) => setNewOption({...newOption, response: e.target.value})}
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