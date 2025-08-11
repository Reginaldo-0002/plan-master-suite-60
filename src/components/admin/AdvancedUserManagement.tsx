
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
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'vip' | 'pro';
  role: string;
  plan_start_date: string | null;
  plan_end_date: string | null;
  plan_status: string;
  auto_renewal: boolean;
  created_at: string;
  updated_at: string;
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
  plan: 'free' | 'vip' | 'pro';
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
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
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

      const { error } = await supabase
        .from('scheduled_notifications')
        .insert([{
          title: messageData.subject,
          message: messageData.message,
          recipient_user_id: messageData.recipient_user_id,
          scheduled_at: scheduledAt,
          is_personal_message: true,
          notification_type: 'info',
          created_by: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (error) throw error;

      toast({
        title: "Mensagem agendada",
        description: "Mensagem agendada com sucesso",
      });

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
        description: error.message || "Erro ao agendar mensagem",
        variant: "destructive",
      });
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
      const { error } = await supabase
        .from('profiles')
        .update({
          plan: 'free',
          plan_status: 'expired',
          plan_end_date: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

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

  const openPlanDialog = (user: User) => {
    setSelectedUser(user);
    setIsPlanDialogOpen(true);
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Não definido";
    return new Date(dateString).toLocaleDateString('pt-BR');
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

      {/* Search */}
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Buscar usuários..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

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
                placeholder="email@exemplo.com"
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
            <DialogDescription>
              Altere o plano e datas de {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label>Plano Atual</Label>
                <Select 
                  defaultValue={selectedUser.plan}
                  onValueChange={(value: any) => {
                    const planData = {
                      plan: value,
                      plan_start_date: selectedUser.plan_start_date,
                      plan_end_date: selectedUser.plan_end_date,
                      plan_status: selectedUser.plan_status,
                      auto_renewal: selectedUser.auto_renewal
                    };
                    updateUserPlan(selectedUser.user_id, planData);
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
                  <Label>Data de Início</Label>
                  <div className="text-sm p-2 bg-muted rounded">
                    {formatDate(selectedUser.plan_start_date)}
                  </div>
                </div>
                <div>
                  <Label>Data de Vencimento</Label>
                  <div className="text-sm p-2 bg-muted rounded">
                    {formatDate(selectedUser.plan_end_date)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Auto Renovação</Label>
                <Badge variant={selectedUser.auto_renewal ? "default" : "secondary"}>
                  {selectedUser.auto_renewal ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <Button
                onClick={() => setIsPlanDialogOpen(false)}
                className="w-full"
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
