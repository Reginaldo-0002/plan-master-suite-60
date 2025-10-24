
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { 
  UserPlus, 
  Calendar, 
  MessageSquare, 
  Clock, 
  Send, 
  Eye, 
  Edit2, 
  Trash2,
  CalendarDays,
  AlertTriangle,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface User {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'vip' | 'pro' | 'premium';
  role: string;
  plan_start_date: string | null;
  plan_end_date: string | null;
  plan_status: string;
  auto_renewal: boolean;
  created_at: string;
  updated_at: string;
  // Additional registration fields
  whatsapp?: string | null;
  purchase_source?: string | null;
  pix_key?: string | null;
  total_session_time?: number;
  areas_accessed?: number;
  referral_code?: string;
  referral_earnings?: number;
  user_email?: string | null;
}

interface MessageData {
  subject: string;
  message: string;
  scheduled_at: string;
  recipient_user_id: string;
}

interface NewUserData {
  email: string;
  password: string;
  full_name: string;
  plan: 'free' | 'vip' | 'pro' | 'premium';
  plan_start_date: string;
  plan_end_date: string;
}

export const AdvancedUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [messageData, setMessageData] = useState<MessageData>({
    subject: "",
    message: "",
    scheduled_at: "",
    recipient_user_id: ""
  });
  const [newUserData, setNewUserData] = useState<NewUserData>({
    email: "",
    password: "",
    full_name: "",
    plan: "free",
    plan_start_date: "",
    plan_end_date: ""
  });
  const [planEditData, setPlanEditData] = useState({
    plan: '',
    plan_start_date: '',
    plan_end_date: '',
    plan_status: 'active',
    auto_renewal: true
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
          .from('profiles')
          .select(`
            id, user_id, full_name, avatar_url, plan, role, 
            plan_start_date, plan_end_date, plan_status, auto_renewal,
            created_at, updated_at, whatsapp, purchase_source, 
            pix_key, total_session_time, areas_accessed, 
            referral_code, referral_earnings
          `)
          .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewUser = async () => {
    if (!newUserData.email || !newUserData.password || !newUserData.full_name) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserData.email,
        password: newUserData.password,
        options: {
          data: {
            full_name: newUserData.full_name
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update profile with plan information
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            plan: newUserData.plan,
            plan_start_date: newUserData.plan_start_date || new Date().toISOString(),
            plan_end_date: newUserData.plan_end_date,
            full_name: newUserData.full_name
          })
          .eq('user_id', authData.user.id);

        if (profileError) throw profileError;

        toast({
          title: "Usuário criado",
          description: "Novo usuário criado com sucesso",
        });

        setIsNewUserDialogOpen(false);
        setNewUserData({
          email: "",
          password: "",
          full_name: "",
          plan: "free",
          plan_start_date: "",
          plan_end_date: ""
        });
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar usuário",
        variant: "destructive",
      });
    }
  };

  const scheduleMessage = async () => {
    if (!messageData.subject || !messageData.message || !messageData.recipient_user_id) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const scheduledAt = messageData.scheduled_at ? 
        new Date(messageData.scheduled_at).toISOString() : 
        new Date().toISOString();

      const currentUser = await supabase.auth.getUser();
      const isImmediate = !messageData.scheduled_at || new Date(messageData.scheduled_at) <= new Date();

      if (isImmediate) {
        // Enviar mensagem imediatamente via chat
        await sendImmediateMessage(messageData.recipient_user_id, messageData.message, currentUser.data.user?.id);
        
        toast({
          title: "Mensagem enviada",
          description: "Mensagem enviada com sucesso para o chat do usuário",
        });
      } else {
        // Agendar para envio futuro
        const { error } = await supabase
          .from('scheduled_notifications')
          .insert([{
            title: messageData.subject,
            message: messageData.message,
            recipient_user_id: messageData.recipient_user_id,
            scheduled_at: scheduledAt,
            is_personal_message: true,
            notification_type: 'chat_message', // Tipo especial para mensagens de chat
            created_by: currentUser.data.user?.id
          }]);

        if (error) throw error;

        toast({
          title: "Mensagem agendada",
          description: "Mensagem agendada com sucesso para o chat do usuário",
        });
      }

      setIsMessageDialogOpen(false);
      setMessageData({
        subject: "",
        message: "",
        scheduled_at: "",
        recipient_user_id: ""
      });
    } catch (error: any) {
      console.error('Error scheduling message:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar/agendar mensagem",
        variant: "destructive",
      });
    }
  };

  const sendImmediateMessage = async (userId: string, message: string, adminId?: string) => {
    try {
      // Buscar ou criar ticket de suporte para o usuário
      let ticketId;
      
      const { data: existingTicket } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingTicket) {
        ticketId = existingTicket.id;
      } else {
        // Criar novo ticket
        const { data: newTicket, error: ticketError } = await supabase
          .from('support_tickets')
          .insert({
            user_id: userId,
            subject: 'Mensagem do Suporte',
            description: 'Mensagem enviada pelo administrador',
            status: 'open',
            priority: 'normal',
            assigned_to: adminId
          })
          .select()
          .single();

        if (ticketError) throw ticketError;
        ticketId = newTicket.id;
      }

      // Enviar mensagem no chat
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: adminId || 'admin',
          message: message,
          is_bot: false,
          is_internal: false
        });

      if (messageError) throw messageError;

      console.log(`Admin message sent to user ${userId} via chat`);
    } catch (error) {
      console.error('Error sending immediate message:', error);
      throw error;
    }
  };

  const updateUserPlan = async (userId: string, planData: any) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          plan: planData.plan,
          plan_start_date: planData.plan_start_date,
          plan_end_date: planData.plan_end_date,
          plan_status: planData.plan_status,
          auto_renewal: planData.auto_renewal
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Plano atualizado",
        description: "Plano do usuário atualizado com sucesso",
      });

      setIsPlanDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user plan:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar plano",
        variant: "destructive",
      });
    }
  };

  const manualExpireUser = async (userId: string) => {
    if (!confirm("Tem certeza que deseja expirar manualmente este usuário?")) return;

    try {
      // Expire o usuário: plan=free, plan_status=expired
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          plan: 'free',
          plan_status: 'expired',
          plan_end_date: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Adicionar à fila de expiração usando UPSERT com a constraint criada
      const { error: queueError } = await supabase
        .from('plan_expiration_queue')
        .upsert({
          user_id: userId,
          expiration_date: new Date().toISOString(),
          reminder_7_days: true,
          reminder_1_day: true,
          expiration_notice: true,
          downgrade_executed: true
        }, {
          onConflict: 'user_id'
        });

      if (queueError) throw queueError;

      toast({
        title: "Usuário expirado",
        description: "Plano do usuário foi expirado manualmente",
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error expiring user:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao expirar usuário",
        variant: "destructive",
      });
    }
  };

  const openMessageDialog = (user: User) => {
    setSelectedUser(user);
    setMessageData({
      ...messageData,
      recipient_user_id: user.user_id
    });
    setIsMessageDialogOpen(true);
  };

const openDetailsDialog = async (user: User) => {
  setSelectedUser(user);
  setIsDetailsDialogOpen(true);
  try {
    // Buscar email com função segura (admin)
    const { data, error } = await supabase
      .rpc('get_all_users_for_admin')
      .eq('user_id', user.user_id)
      .maybeSingle();

    if (!error && data && data.user_email) {
      setSelectedUser((prev) => prev ? { ...prev, user_email: data.user_email } : prev);
    }
  } catch (e) {
    console.warn('Não foi possível carregar o email do usuário:', e);
  }
};

  const openPlanDialog = (user: User) => {
    setSelectedUser(user);
    // Converter datas para formato input
    const formatDateForInput = (dateString: string | null) => {
      if (!dateString) return '';
      return new Date(dateString).toISOString().split('T')[0];
    };
    
    setPlanEditData({
      plan: user.plan,
      plan_start_date: formatDateForInput(user.plan_start_date),
      plan_end_date: formatDateForInput(user.plan_end_date),
      plan_status: user.plan_status,
      auto_renewal: user.auto_renewal
    });
    setIsPlanDialogOpen(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlan = planFilter === "all" || user.plan === planFilter;
    
    // Filtro de data
    const now = new Date();
    const userCreatedAt = new Date(user.created_at);
    const daysDiff = Math.floor((now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    let matchesDate = true;
    if (dateFilter === "last7days") {
      matchesDate = daysDiff <= 7;
    } else if (dateFilter === "last30days") {
      matchesDate = daysDiff <= 30;
    } else if (dateFilter === "over90days") {
      matchesDate = daysDiff > 90;
    } else if (dateFilter === "over180days") {
      matchesDate = daysDiff > 180;
    } else if (dateFilter === "over1year") {
      matchesDate = daysDiff > 365;
    }
    
    // Filtro de status (plano vencido)
    let matchesStatus = true;
    if (statusFilter === "expired") {
      matchesStatus = user.plan_status === 'expired';
    } else if (statusFilter === "active") {
      matchesStatus = user.plan_status === 'active' && user.plan !== 'free';
    } else if (statusFilter === "free") {
      matchesStatus = user.plan === 'free';
    }
    
    return matchesSearch && matchesPlan && matchesDate && matchesStatus;
  });

const formatDate = (dateString: string | null) => {
  if (!dateString) return "Não definido";
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const formatTime = (minutes?: number) => {
  if (minutes === undefined || minutes === null) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

  const exportToExcel = () => {
    // Preparar dados para exportação
    const exportData = filteredUsers.map(user => ({
      'Nome': user.full_name || 'Não informado',
      'Email': user.user_email || 'Não informado',
      'WhatsApp': user.whatsapp || 'Não informado',
      'Plataforma': user.purchase_source || 'Não informado',
      'Plano': user.plan.toUpperCase(),
      'Status': user.plan_status,
      'Data Início': formatDate(user.plan_start_date),
      'Data Fim': formatDate(user.plan_end_date),
      'Auto Renovação': user.auto_renewal ? 'Sim' : 'Não',
      'Tempo de Uso': formatTime(user.total_session_time),
      'Áreas Acessadas': user.areas_accessed || 0,
      'Chave PIX': user.pix_key || 'Não informado',
      'Ganhos por Indicação': `R$ ${(user.referral_earnings || 0).toFixed(2)}`,
      'Código de Indicação': user.referral_code || 'Não informado',
      'Data de Cadastro': formatDate(user.created_at),
      'Última Atualização': formatDate(user.updated_at),
    }));

    // Criar planilha
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Usuários');

    // Ajustar largura das colunas
    const colWidths = [
      { wch: 25 }, // Nome
      { wch: 30 }, // Email
      { wch: 15 }, // WhatsApp
      { wch: 15 }, // Plataforma
      { wch: 10 }, // Plano
      { wch: 12 }, // Status
      { wch: 15 }, // Data Início
      { wch: 15 }, // Data Fim
      { wch: 15 }, // Auto Renovação
      { wch: 15 }, // Tempo de Uso
      { wch: 15 }, // Áreas Acessadas
      { wch: 25 }, // Chave PIX
      { wch: 20 }, // Ganhos
      { wch: 20 }, // Código
      { wch: 15 }, // Data Cadastro
      { wch: 15 }, // Última Atualização
    ];
    ws['!cols'] = colWidths;

    // Gerar arquivo
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `relatorio-usuarios-${timestamp}.xlsx`);

    toast({
      title: "Relatório gerado",
      description: `${filteredUsers.length} usuários exportados com sucesso`,
    });
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'vip': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Gestão Avançada de Usuários
          </h2>
          <p className="text-muted-foreground">
            Criar usuários, agendar mensagens e gerenciar planos
          </p>
        </div>
        <Button onClick={() => setIsNewUserDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Filtros e Busca */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-foreground">Filtros</CardTitle>
          <Button 
            onClick={exportToExcel}
            variant="outline"
            className="bg-green-50 hover:bg-green-100 text-green-600 border-green-200"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar Relatório Excel
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nome ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os planos</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Filtrar por data de cadastro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as datas</SelectItem>
                  <SelectItem value="last7days">Últimos 7 dias (Novos)</SelectItem>
                  <SelectItem value="last30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="over90days">Mais de 90 dias</SelectItem>
                  <SelectItem value="over180days">Mais de 180 dias</SelectItem>
                  <SelectItem value="over1year">Mais de 1 ano</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Planos Ativos (VIP/PRO)</SelectItem>
                  <SelectItem value="free">Plano Free</SelectItem>
                  <SelectItem value="expired">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Gerencie usuários, planos e mensagens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Auto Renovação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback>
                          {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.full_name || "Sem nome"}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.user_id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPlanBadgeColor(user.plan)}>
                      {user.plan.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(user.plan_status)}>
                      {user.plan_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Início: {formatDate(user.plan_start_date)}</div>
                      <div>Fim: {formatDate(user.plan_end_date)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.auto_renewal ? "default" : "secondary"}>
                      {user.auto_renewal ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
<div className="flex items-center gap-2">
  <Button
    variant="ghost"
    size="sm"
    onClick={() => openDetailsDialog(user)}
    title="Ver Detalhes"
  >
    <Eye className="w-4 h-4 mr-1" />
    Detalhes
  </Button>

  <Button
    variant="ghost"
    size="sm"
    onClick={() => openMessageDialog(user)}
    title="Enviar/Agendar Mensagem"
  >
    <MessageSquare className="w-4 h-4" />
  </Button>
  
  <Button
    variant="ghost"
    size="sm"
    onClick={() => openPlanDialog(user)}
    title="Editar Plano"
  >
    <CalendarDays className="w-4 h-4" />
  </Button>
  
  {user.plan !== 'free' && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => manualExpireUser(user.user_id)}
      className="text-red-600 hover:text-red-700"
      title="Expirar Manualmente"
    >
      <AlertTriangle className="w-4 h-4" />
    </Button>
  )}
</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

{/* Detalhes do Usuário */}
<Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Detalhes do Usuário</DialogTitle>
      <DialogDescription>Visualize todas as informações cadastradas</DialogDescription>
    </DialogHeader>
    {selectedUser && (
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
          <Avatar className="h-16 w-16">
            <AvatarImage src={selectedUser.avatar_url || ""} />
            <AvatarFallback className="text-xl">
              {selectedUser.full_name ? selectedUser.full_name.charAt(0).toUpperCase() : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{selectedUser.full_name || "Sem nome"}</h3>
            <p className="text-sm text-muted-foreground">ID: {selectedUser.user_id}</p>
            <div className="flex gap-2 mt-2">
              <Badge className={getPlanBadgeColor(selectedUser.plan)}>
                {selectedUser.plan.toUpperCase()}
              </Badge>
              <Badge className={getStatusBadgeColor(selectedUser.plan_status)}>
                {selectedUser.plan_status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-base border-b pb-2">📞 Contato</h4>
          <div className="grid grid-cols-1 gap-3">
            <div className="p-3 bg-background border rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">📧 Email</label>
              <p className="text-sm font-medium break-all">{selectedUser.user_email || "Email não informado"}</p>
            </div>
            <div className="p-3 bg-background border rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">📱 WhatsApp</label>
              <p className="text-sm font-medium">{selectedUser.whatsapp || "Não informado"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-base border-b pb-2">🛒 Compra</h4>
          <div className="grid grid-cols-1 gap-3">
            <div className="p-3 bg-background border rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Plataforma de Compra</label>
              <p className="text-sm font-medium">{selectedUser.purchase_source || "Não informado"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-base border-b pb-2">💰 Financeiro</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-background border rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Chave PIX</label>
              <p className="text-sm font-medium">{selectedUser.pix_key || "Não informado"}</p>
            </div>
            <div className="p-3 bg-background border rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Ganhos Indicação</label>
              <p className="text-sm font-medium">R$ {(selectedUser.referral_earnings || 0).toFixed(2)}</p>
            </div>
            <div className="p-3 bg-background border rounded-lg md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Código de Indicação</label>
              <p className="text-sm font-medium font-mono">{selectedUser.referral_code || "-"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-base border-b pb-2">📊 Uso</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-background border rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Tempo Total</label>
              <p className="text-sm font-medium">{formatTime(selectedUser.total_session_time)}</p>
            </div>
            <div className="p-3 bg-background border rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Áreas Acessadas</label>
              <p className="text-sm font-medium">{selectedUser.areas_accessed ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-base border-b pb-2">📅 Datas</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-background border rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Cadastro</label>
              <p className="text-sm font-medium">{formatDate(selectedUser.created_at)}</p>
            </div>
            <div className="p-3 bg-background border rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Atualização</label>
              <p className="text-sm font-medium">{formatDate(selectedUser.updated_at)}</p>
            </div>
            <div className="p-3 bg-background border rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Início do Plano</label>
              <p className="text-sm font-medium">{formatDate(selectedUser.plan_start_date)}</p>
            </div>
            <div className="p-3 bg-background border rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Fim do Plano</label>
              <p className="text-sm font-medium">{formatDate(selectedUser.plan_end_date)}</p>
            </div>
          </div>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>

{/* New User Dialog */}
      <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Cadastre um novo usuário no sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                placeholder="email@suaempresa.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                placeholder="Senha (mín. 6 caracteres)"
              />
            </div>
            <div>
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={newUserData.full_name}
                onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="plan">Plano</Label>
              <Select value={newUserData.plan} onValueChange={(value: any) => setNewUserData({ ...newUserData, plan: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="plan_start">Data de Início</Label>
                <Input
                  id="plan_start"
                  type="date"
                  value={newUserData.plan_start_date}
                  onChange={(e) => setNewUserData({ ...newUserData, plan_start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="plan_end">Data de Vencimento</Label>
                <Input
                  id="plan_end"
                  type="date"
                  value={newUserData.plan_end_date}
                  onChange={(e) => setNewUserData({ ...newUserData, plan_end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={createNewUser} className="flex-1">
                <UserPlus className="w-4 h-4 mr-2" />
                Criar Usuário
              </Button>
              <Button variant="outline" onClick={() => setIsNewUserDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar/Agendar Mensagem</DialogTitle>
            <DialogDescription>
              Envie ou agende uma mensagem para {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                value={messageData.subject}
                onChange={(e) => setMessageData({ ...messageData, subject: e.target.value })}
                placeholder="Assunto da mensagem"
              />
            </div>
            <div>
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                value={messageData.message}
                onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                placeholder="Conteúdo da mensagem"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="scheduled_at">Agendar para (opcional)</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={messageData.scheduled_at}
                onChange={(e) => setMessageData({ ...messageData, scheduled_at: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe em branco para enviar imediatamente
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={scheduleMessage} className="flex-1">
                {messageData.scheduled_at ? (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Agendar
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Agora
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plan Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
            <DialogDescription>
              Altere o plano, datas e status de {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label>Plano</Label>
                <Select 
                  value={planEditData.plan}
                  onValueChange={(value: any) => {
                    setPlanEditData({ ...planEditData, plan: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="plan_start_edit">Data de Início</Label>
                  <Input
                    id="plan_start_edit"
                    type="date"
                    value={planEditData.plan_start_date}
                    onChange={(e) => {
                      setPlanEditData({ ...planEditData, plan_start_date: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="plan_end_edit">Data de Vencimento</Label>
                  <Input
                    id="plan_end_edit"
                    type="date"
                    value={planEditData.plan_end_date}
                    onChange={(e) => {
                      const newEndDate = e.target.value;
                      const today = new Date().toISOString().split('T')[0];
                      const newStatus = newEndDate && newEndDate >= today ? 'active' : 'expired';
                      
                      setPlanEditData({ 
                        ...planEditData, 
                        plan_end_date: newEndDate,
                        plan_status: newStatus
                      });
                    }}
                  />
                </div>
              </div>

              <div>
                <Label>Status do Plano</Label>
                <Select 
                  value={planEditData.plan_status}
                  onValueChange={(value: string) => {
                    setPlanEditData({ ...planEditData, plan_status: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="expired">Expirado</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Status é atualizado automaticamente baseado na data de vencimento
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label>Auto Renovação</Label>
                <Select 
                  value={planEditData.auto_renewal ? "true" : "false"}
                  onValueChange={(value: string) => {
                    setPlanEditData({ ...planEditData, auto_renewal: value === "true" });
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    // Converter datas de volta para ISO
                    const startDate = planEditData.plan_start_date ? 
                      new Date(planEditData.plan_start_date + 'T00:00:00').toISOString() : null;
                    const endDate = planEditData.plan_end_date ? 
                      new Date(planEditData.plan_end_date + 'T23:59:59').toISOString() : null;
                    
                    const planData = {
                      plan: planEditData.plan,
                      plan_start_date: startDate,
                      plan_end_date: endDate,
                      plan_status: planEditData.plan_status,
                      auto_renewal: planEditData.auto_renewal
                    };
                    updateUserPlan(selectedUser.user_id, planData);
                  }}
                  className="flex-1"
                >
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsPlanDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
