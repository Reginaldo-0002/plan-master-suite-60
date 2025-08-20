import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Search, Eye, Ban, Trash2, UserPlus, MessageSquare, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateUserDialog } from "./CreateUserDialog";

interface User {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'vip' | 'pro';
  role: 'user' | 'admin' | 'moderator';
  pix_key: string | null;
  total_session_time: number;
  areas_accessed: number;
  referral_code: string;
  referral_earnings: number;
  created_at: string;
  updated_at: string;
  is_blocked?: boolean;
  user_roles?: Array<{ role: string }>;
  whatsapp?: string | null;
  purchase_source?: string | null; 
  user_email?: string | null;
}

export const AdminUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('user-management')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users using RPC function...');
      
      // Use the new RPC function to get all users (bypasses RLS)
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_all_users_for_admin');

      if (usersError) {
        console.error('RPC error:', usersError);
        throw usersError;
      }

      console.log('RPC users data:', usersData);
      setUsers(usersData as User[]);
      
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários. Verifique suas permissões de administrador.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserPlan = async (userId: string, newPlan: 'free' | 'vip' | 'pro') => {
    try {
      console.log('Updating user plan:', { userId, newPlan });
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ plan: newPlan })
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('Error updating plan:', error);
        throw error;
      }

      console.log('Plan update successful:', data);

      toast({
        title: "Sucesso",
        description: `Plano atualizado para ${newPlan.toUpperCase()}`,
      });
      
      // Recarregar dados imediatamente
      fetchUsers();
    } catch (error) {
      console.error('Error updating user plan:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar plano do usuário",
        variant: "destructive",
      });
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin' | 'moderator') => {
    try {
      // Update in user_roles table instead of profiles
      const { error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId,
          role: newRole
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Função atualizada para ${newRole}`,
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar função do usuário",
        variant: "destructive",
      });
    }
  };

  const blockUser = async (userId: string) => {
    try {
      // Add blocking functionality here - for now just change role to user
      const { error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId,
          role: 'user'
        });

      if (error) throw error;

      toast({
        title: "Usuário alterado",
        description: "Usuário definido como usuário comum",
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar usuário",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário permanentemente?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Usuário excluído",
        description: "O usuário foi removido permanentemente",
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir usuário",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!selectedUser || !messageContent || !messageSubject) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos da mensagem",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a notification for the user
      const { error } = await supabase
        .from('notifications')
        .insert({
          title: messageSubject,
          message: messageContent,
          type: 'info',
          target_users: [selectedUser.user_id],
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Mensagem enviada com sucesso",
      });
      
      setIsMessageDialogOpen(false);
      setMessageContent("");
      setMessageSubject("");
      setSelectedUser(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem",
        variant: "destructive",
      });
    }
  };

  const openDetailsDialog = (user: User) => {
    setSelectedUser(user);
    setIsDetailsDialogOpen(true);
  };

  const openMessageDialog = (user: User) => {
    setSelectedUser(user);
    setIsMessageDialogOpen(true);
  };

  const handleUserCreated = () => {
    fetchUsers();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlan = planFilter === "all" || user.plan === planFilter;
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesPlan && matchesRole;
  });

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'vip': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'moderator': return 'bg-orange-100 text-orange-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const userStats = {
    total: users.length,
    free: users.filter(u => u.plan === 'free').length,
    vip: users.filter(u => u.plan === 'vip').length,
    pro: users.filter(u => u.plan === 'pro').length,
    admins: users.filter(u => u.role === 'admin').length,
  };

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Usuários</h2>
          <p className="text-muted-foreground">
            Gerencie todos os usuários da plataforma
          </p>
        </div>
        <Button onClick={() => setIsCreateUserDialogOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* User Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{userStats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Free
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{userStats.free}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              VIP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{userStats.vip}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{userStats.pro}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{userStats.admins}</div>
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
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as funções</SelectItem>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="moderator">Moderador</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Usuários ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Lista completa de usuários com detalhes e ações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Tempo de Uso</TableHead>
                <TableHead>Cadastro</TableHead>
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
                        <div className="font-medium text-foreground">
                          {user.full_name || "Sem nome"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.user_id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-foreground">
                      {user.user_email || "Não informado"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-foreground">
                      {user.whatsapp || "Não informado"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-foreground">
                      {user.purchase_source || "Não informado"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={user.plan} 
                      onValueChange={(value: 'free' | 'vip' | 'pro') => updateUserPlan(user.user_id, value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={user.role} 
                      onValueChange={(value: 'user' | 'admin' | 'moderator') => updateUserRole(user.user_id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="moderator">Moderador</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{formatTime(user.total_session_time)}</TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('Opening details for user:', user);
                          openDetailsDialog(user);
                        }}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
                        title="Ver detalhes do usuário"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Detalhes
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openMessageDialog(user)}
                        className="bg-green-50 hover:bg-green-100 text-green-600 border-green-200"
                        title="Enviar mensagem"
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Mensagem
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => blockUser(user.user_id)}
                        className="bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-200"
                        title="Bloquear usuário"
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        Bloquear
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteUser(user.user_id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                        title="Excluir usuário"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Detalhes Completos do Usuário</DialogTitle>
            <DialogDescription>
              Visualize todas as informações detalhadas do usuário cadastrado
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* Header com Avatar e Info Principal */}
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar_url || ""} />
                  <AvatarFallback className="text-xl">
                    {selectedUser.full_name ? selectedUser.full_name.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{selectedUser.full_name || "Nome não informado"}</h3>
                  <p className="text-sm text-muted-foreground">ID: {selectedUser.user_id}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className={getPlanBadgeColor(selectedUser.plan)}>
                      {selectedUser.plan.toUpperCase()}
                    </Badge>
                    <Badge className={getRoleBadgeColor(selectedUser.role)}>
                      {selectedUser.role}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Informações de Contato */}
              <div className="space-y-3">
                <h4 className="font-semibold text-base border-b pb-2">📞 Informações de Contato</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3 bg-background border rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm font-medium">{selectedUser.user_email || "Não informado"}</p>
                  </div>
                  <div className="p-3 bg-background border rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">WhatsApp</label>
                    <p className="text-sm font-medium">{selectedUser.whatsapp || "Não informado"}</p>
                  </div>
                </div>
              </div>

              {/* Informações de Compra */}
              <div className="space-y-3">
                <h4 className="font-semibold text-base border-b pb-2">🛒 Informações de Compra</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3 bg-background border rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Plataforma de Compra</label>
                    <p className="text-sm font-medium">{selectedUser.purchase_source || "Não informado"}</p>
                  </div>
                  <div className="p-3 bg-background border rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Plano Atual</label>
                    <p className="text-sm font-medium">{selectedUser.plan.toUpperCase()}</p>
                  </div>
                </div>
              </div>

              {/* Informações Financeiras */}
              <div className="space-y-3">
                <h4 className="font-semibold text-base border-b pb-2">💰 Informações Financeiras</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3 bg-background border rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Chave PIX</label>
                    <p className="text-sm font-medium">{selectedUser.pix_key || "Não informado"}</p>
                  </div>
                  <div className="p-3 bg-background border rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Ganhos por Indicação</label>
                    <p className="text-sm font-medium text-green-600">R$ {selectedUser.referral_earnings.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-background border rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Código de Indicação</label>
                    <p className="text-sm font-medium font-mono">{selectedUser.referral_code}</p>
                  </div>
                </div>
              </div>

              {/* Estatísticas de Uso */}
              <div className="space-y-3">
                <h4 className="font-semibold text-base border-b pb-2">📊 Estatísticas de Uso</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-background border rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Tempo Total de Uso</label>
                    <p className="text-sm font-medium">{formatTime(selectedUser.total_session_time)}</p>
                  </div>
                  <div className="p-3 bg-background border rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Áreas Acessadas</label>
                    <p className="text-sm font-medium">{selectedUser.areas_accessed}</p>
                  </div>
                </div>
              </div>

              {/* Datas Importantes */}
              <div className="space-y-3">
                <h4 className="font-semibold text-base border-b pb-2">📅 Datas Importantes</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-background border rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Data de Cadastro</label>
                    <p className="text-sm font-medium">
                      {new Date(selectedUser.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="p-3 bg-background border rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Última Atualização</label>
                    <p className="text-sm font-medium">
                      {new Date(selectedUser.updated_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Mensagem</DialogTitle>
            <DialogDescription>
              Envie uma mensagem para {selectedUser?.full_name || "este usuário"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="message-subject">Assunto</Label>
              <Input
                id="message-subject"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Assunto da mensagem..."
              />
            </div>
            <div>
              <Label htmlFor="message-content">Mensagem</Label>
              <Textarea
                id="message-content"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={sendMessage} className="flex-1">
                <MessageSquare className="w-4 h-4 mr-2" />
                Enviar Mensagem
              </Button>
              <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <CreateUserDialog
        isOpen={isCreateUserDialogOpen}
        onClose={() => setIsCreateUserDialogOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </div>
  );
};
