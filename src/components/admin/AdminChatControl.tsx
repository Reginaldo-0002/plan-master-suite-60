
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquareOff, Clock, User, Shield } from "lucide-react";

interface ChatRestriction {
  id: string;
  user_id: string;
  blocked_until: string | null;
  reason: string | null;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    plan: string;
  } | null;
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  plan: string;
}

export const AdminChatControl = () => {
  const [globalChatBlocked, setGlobalChatBlocked] = useState(false);
  const [globalBlockUntil, setGlobalBlockUntil] = useState("");
  const [userRestrictions, setUserRestrictions] = useState<ChatRestriction[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [blockDuration, setBlockDuration] = useState("");
  const [blockUnit, setBlockUnit] = useState<"minutes" | "hours" | "days">("hours");
  const [blockReason, setBlockReason] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchChatSettings();
    fetchUserRestrictions();
    fetchUsers();
  }, []);

  const fetchChatSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('chat_blocked_until')
        .eq('key', 'global_chat_settings')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.chat_blocked_until) {
        const blockUntil = new Date(data.chat_blocked_until);
        setGlobalChatBlocked(blockUntil > new Date());
        setGlobalBlockUntil(blockUntil.toISOString().slice(0, 16));
      }
    } catch (error) {
      console.error('Error fetching chat settings:', error);
    }
  };

  const fetchUserRestrictions = async () => {
    try {
      // First get the restrictions
      const { data: restrictions, error: restrictionsError } = await supabase
        .from('user_chat_restrictions')
        .select('*')
        .order('created_at', { ascending: false });

      if (restrictionsError) throw restrictionsError;

      // Then get user profiles for those restrictions
      if (restrictions && restrictions.length > 0) {
        const userIds = restrictions.map(r => r.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, plan')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        // Combine the data
        const enrichedRestrictions = restrictions.map(restriction => ({
          ...restriction,
          user_profile: profiles?.find(p => p.user_id === restriction.user_id) || null
        }));

        setUserRestrictions(enrichedRestrictions);
      } else {
        setUserRestrictions([]);
      }
    } catch (error) {
      console.error('Error fetching user restrictions:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, plan')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const toggleGlobalChatBlock = async () => {
    setIsLoading(true);
    try {
      const blockUntil = globalChatBlocked ? null : (globalBlockUntil ? new Date(globalBlockUntil) : new Date(Date.now() + 24 * 60 * 60 * 1000));

      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          key: 'global_chat_settings',
          value: {},
          chat_blocked_until: blockUntil?.toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      setGlobalChatBlocked(!globalChatBlocked);
      toast({
        title: "Sucesso",
        description: `Chat global ${!globalChatBlocked ? 'bloqueado' : 'desbloqueado'} com sucesso`,
      });
    } catch (error) {
      console.error('Error updating global chat:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar configuração do chat",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const blockUserChat = async () => {
    if (!selectedUserId || !blockDuration) {
      toast({
        title: "Erro",
        description: "Selecione um usuário e defina a duração",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const duration = parseInt(blockDuration);
      let milliseconds = 0;

      switch (blockUnit) {
        case 'minutes':
          milliseconds = duration * 60 * 1000;
          break;
        case 'hours':
          milliseconds = duration * 60 * 60 * 1000;
          break;
        case 'days':
          milliseconds = duration * 24 * 60 * 60 * 1000;
          break;
      }

      const blockedUntil = new Date(Date.now() + milliseconds);

      const { error } = await supabase
        .from('user_chat_restrictions')
        .insert({
          user_id: selectedUserId,
          blocked_until: blockedUntil.toISOString(),
          reason: blockReason || 'Bloqueio temporário',
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário bloqueado do chat com sucesso",
      });

      setSelectedUserId("");
      setBlockDuration("");
      setBlockReason("");
      fetchUserRestrictions();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: "Erro",
        description: "Erro ao bloquear usuário",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unblockUser = async (restrictionId: string) => {
    setIsLoading(true);
    try {
      console.log('🔓 Attempting to unblock user with restriction ID:', restrictionId);
      
      // Delete the restriction instead of updating it to avoid field errors
      const { error } = await supabase
        .from('user_chat_restrictions')
        .delete()
        .eq('id', restrictionId);

      if (error) {
        console.error('❌ Error unblocking user:', error);
        throw error;
      }

      console.log('✅ User unblocked successfully');
      toast({
        title: "Sucesso",
        description: "Usuário desbloqueado do chat",
      });

      fetchUserRestrictions();
    } catch (error) {
      console.error('💥 Error unblocking user:', error);
      toast({
        title: "Erro", 
        description: `Erro ao desbloquear usuário: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controle Global do Chat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Controle Global do Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Status do Chat Global</p>
              <p className="text-sm text-muted-foreground">
                {globalChatBlocked ? 'Chat bloqueado para todos os usuários' : 'Chat ativo para todos os usuários'}
              </p>
            </div>
            <Badge variant={globalChatBlocked ? "destructive" : "secondary"}>
              {globalChatBlocked ? "Bloqueado" : "Ativo"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="global-block-until">Bloquear até</Label>
              <Input
                id="global-block-until"
                type="datetime-local"
                value={globalBlockUntil}
                onChange={(e) => setGlobalBlockUntil(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={toggleGlobalChatBlock}
                variant={globalChatBlocked ? "outline" : "destructive"}
                disabled={isLoading}
                className="w-full"
              >
                <MessageSquareOff className="w-4 h-4 mr-2" />
                {globalChatBlocked ? "Desbloquear Chat" : "Bloquear Chat"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bloquear Usuário Específico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Bloquear Usuário Específico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="user-select">Usuário</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name || 'Usuário sem nome'} ({user.plan})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="block-duration">Duração</Label>
              <div className="flex gap-2">
                <Input
                  id="block-duration"
                  type="number"
                  min="1"
                  value={blockDuration}
                  onChange={(e) => setBlockDuration(e.target.value)}
                  placeholder="Ex: 24"
                />
                <Select value={blockUnit} onValueChange={(value: any) => setBlockUnit(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutos</SelectItem>
                    <SelectItem value="hours">Horas</SelectItem>
                    <SelectItem value="days">Dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="block-reason">Motivo (opcional)</Label>
            <Textarea
              id="block-reason"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Motivo do bloqueio..."
              rows={2}
            />
          </div>

          <Button
            onClick={blockUserChat}
            disabled={isLoading || !selectedUserId || !blockDuration}
            className="w-full"
          >
            <MessageSquareOff className="w-4 h-4 mr-2" />
            Bloquear Usuário
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Usuários Bloqueados */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Bloqueados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userRestrictions.filter(restriction => 
              restriction.blocked_until && new Date(restriction.blocked_until) > new Date()
            ).map((restriction) => (
              <div key={restriction.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">
                    {restriction.user_profile?.full_name || 'Usuário sem nome'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Plano: {restriction.user_profile?.plan} | 
                    Bloqueado até: {new Date(restriction.blocked_until!).toLocaleString('pt-BR')}
                  </p>
                  {restriction.reason && (
                    <p className="text-sm text-muted-foreground">
                      Motivo: {restriction.reason}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unblockUser(restriction.id)}
                  disabled={isLoading}
                >
                  Desbloquear
                </Button>
              </div>
            ))}
            
            {userRestrictions.filter(restriction => 
              restriction.blocked_until && new Date(restriction.blocked_until) > new Date()
            ).length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Nenhum usuário está bloqueado no momento
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
