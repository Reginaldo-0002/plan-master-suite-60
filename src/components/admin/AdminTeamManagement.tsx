import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { UserCog, Edit2, Trash2, Shield, Users, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  plan: string;
  created_at: string;
  total_session_time: number;
  areas_accessed: number;
}

type UserRole = 'admin' | 'moderator' | 'user';

export const AdminTeamManagement = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>("user");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchTeamMembers();
    
    const channel = supabase
      .channel('team-management')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_roles'
      }, () => {
        fetchTeamMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTeamMembers = async () => {
    try {
      console.log('Fetching team members...');
      
      // Usar a função RPC que já existe para buscar usuários com roles
      const { data, error } = await supabase.rpc('get_all_users_for_admin');

      if (error) {
        console.error('Error fetching team members:', error);
        throw error;
      }

      console.log('Team members data:', data);
      
      // Mostrar todos os usuários para permitir gestão de equipe
      const teamData = data || [];
      
      setTeamMembers(teamData);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar membros da equipe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async () => {
    if (!selectedMember || !newRole) return;

    try {
      console.log('Updating member role:', { userId: selectedMember.user_id, newRole });
      
      // Obter o usuário atual (admin que está fazendo a alteração)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Usar upsert para atualizar ou inserir o role
      const { error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: selectedMember.user_id,
          role: newRole,
          assigned_by: user.id,
          assigned_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error updating role:', error);
        throw error;
      }

      console.log('Role updated successfully');

      toast({
        title: "Sucesso",
        description: `Cargo atualizado para ${newRole === 'admin' ? 'Administrador' : newRole === 'moderator' ? 'Moderador' : 'Usuário'} com sucesso`,
      });
      
      setIsEditDialogOpen(false);
      setSelectedMember(null);
      setNewRole("user");
      
      // Recarregar os dados imediatamente
      await fetchTeamMembers();
      
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar cargo",
        variant: "destructive",
      });
    }
  };

  const removeMember = async (userId: string) => {
    if (!confirm("Tem certeza que deseja remover este membro da equipe?")) {
      return;
    }

    try {
      console.log('Removing member from team:', userId);
      
      // Remover da tabela user_roles ou definir como 'user'
      const { error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId,
          role: 'user' as UserRole
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error removing member:', error);
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Membro removido da equipe",
      });
      
      fetchTeamMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover membro",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (member: TeamMember) => {
    console.log('Opening edit dialog for member:', member);
    setSelectedMember(member);
    setNewRole(member.role as UserRole);
    setIsEditDialogOpen(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'moderator': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'vip': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4" />;
      case 'moderator': return <Shield className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const filteredMembers = teamMembers.filter(member =>
    member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const adminCount = teamMembers.filter(m => m.role === 'admin').length;
  const moderatorCount = teamMembers.filter(m => m.role === 'moderator').length;
  const totalMembers = teamMembers.length;

  if (loading) {
    return (
      <div className="flex-1 space-y-8 p-8">
        <div className="text-center">Carregando membros da equipe...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Equipe</h2>
          <p className="text-muted-foreground">
            Gerencie papéis e permissões dos membros da equipe
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{adminCount}</div>
            <div className="text-sm text-muted-foreground">Admins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{moderatorCount}</div>
            <div className="text-sm text-muted-foreground">Moderadores</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{totalMembers}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Buscar por nome ou cargo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Membros da Equipe ({filteredMembers.length})</CardTitle>
          <CardDescription>
            Lista de todos os membros com acesso administrativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membro</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Atividade</TableHead>
                <TableHead>Membro desde</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {member.full_name ? member.full_name.charAt(0).toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-foreground">
                          {member.full_name || "Sem nome"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.user_id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(member.role)}>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(member.role)}
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPlanBadgeColor(member.plan)}>
                      {member.plan.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{Math.floor(member.total_session_time / 60)}h online</div>
                      <div className="text-muted-foreground">{member.areas_accessed} áreas acessadas</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(member.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(member)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {member.role !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember(member.user_id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cargo do Membro</DialogTitle>
            <DialogDescription>
              Altere o cargo e permissões do membro selecionado
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedMember.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedMember.full_name ? selectedMember.full_name.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-foreground">
                    {selectedMember.full_name || "Sem nome"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Cargo atual: {selectedMember.role}
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="role">Novo Cargo</Label>
                <Select value={newRole} onValueChange={(value: UserRole) => setNewRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="moderator">Moderador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                <strong>Permissões por cargo:</strong>
                <ul className="mt-2 space-y-1">
                  <li>• <strong>Usuário:</strong> Acesso básico à plataforma</li>
                  <li>• <strong>Moderador:</strong> Gerenciar suporte e conteúdo</li>
                  <li>• <strong>Admin:</strong> Acesso total ao painel administrativo</li>
                </ul>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={updateMemberRole} className="flex-1">
                  <UserCog className="w-4 h-4 mr-2" />
                  Atualizar Cargo
                </Button>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
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
