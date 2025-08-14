import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { EyeOff, Eye, Users, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Content {
  id: string;
  title: string;
  content_type: string;
  required_plan: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  plan: string;
}

interface VisibilityRule {
  id: string;
  content_id: string;
  user_id: string;
  is_visible: boolean;
  created_at: string;
  profiles?: Profile | null;
  content?: Content | null;
}

interface AdminContentVisibilityProps {
  contentId?: string;
}

export const AdminContentVisibility = ({ contentId }: AdminContentVisibilityProps) => {
  const [contents, setContents] = useState<Content[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [visibilityRules, setVisibilityRules] = useState<VisibilityRule[]>([]);
  const [selectedContent, setSelectedContent] = useState<string>(contentId || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedContent) {
      fetchVisibilityRules();
    }
  }, [selectedContent]);

  const fetchData = async () => {
    try {
      // Buscar conteúdos
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('id, title, content_type, required_plan')
        .eq('is_active', true)
        .order('title');

      if (contentError) throw contentError;

      // Buscar usuários
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, plan')
        .order('full_name');

      if (userError) throw userError;

      setContents(contentData || []);
      setUsers(userData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVisibilityRules = async () => {
    if (!selectedContent) return;

    try {
      // Buscar regras de visibilidade primeiro
      const { data: rulesData, error } = await supabase
        .from('content_visibility_rules')
        .select('*')
        .eq('content_id', selectedContent)
        .eq('is_visible', false);

      if (error) throw error;

      // Depois buscar dados dos usuários para cada regra
      const enrichedRules = await Promise.all((rulesData || []).map(async (rule) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, plan')
          .eq('user_id', rule.user_id)
          .single();

        const { data: contentData } = await supabase
          .from('content')
          .select('id, title, content_type, required_plan')
          .eq('id', rule.content_id)
          .single();

        return {
          ...rule,
          profiles: profileData,
          content: contentData
        };
      }));

      setVisibilityRules(enrichedRules);
    } catch (error) {
      console.error('Error fetching visibility rules:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar regras de visibilidade",
        variant: "destructive",
      });
    }
  };

  const hideContentFromUsers = async () => {
    if (!selectedContent || selectedUsers.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione um conteúdo e pelo menos um usuário",
        variant: "destructive",
      });
      return;
    }

    try {
      const currentUser = await supabase.auth.getUser();
      const rulesToInsert = selectedUsers.map(userId => ({
        content_id: selectedContent,
        user_id: userId,
        is_visible: false,
        created_by: currentUser.data.user?.id,
      }));

      const { error } = await supabase
        .from('content_visibility_rules')
        .upsert(rulesToInsert, {
          onConflict: 'content_id,user_id'
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Conteúdo ocultado para ${selectedUsers.length} usuário(s)`,
      });

      setSelectedUsers([]);
      fetchVisibilityRules();
    } catch (error) {
      console.error('Error hiding content:', error);
      toast({
        title: "Erro",
        description: "Erro ao ocultar conteúdo",
        variant: "destructive",
      });
    }
  };

  const showContentToUser = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('content_visibility_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conteúdo liberado para o usuário",
      });

      fetchVisibilityRules();
    } catch (error) {
      console.error('Error showing content:', error);
      toast({
        title: "Erro",
        description: "Erro ao liberar conteúdo",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.plan?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Visibilidade de Conteúdo</h2>
        <p className="text-muted-foreground">
          Gerencie quais usuários podem ver conteúdos específicos
        </p>
      </div>

      {/* Seleção de Conteúdo */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Conteúdo</CardTitle>
          <CardDescription>
            Escolha o conteúdo para gerenciar visibilidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedContent} onValueChange={setSelectedContent}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um conteúdo" />
            </SelectTrigger>
            <SelectContent>
              {contents.map(content => (
                <SelectItem key={content.id} value={content.id}>
                  {content.title} ({content.content_type} - {content.required_plan})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedContent && (
        <>
          {/* Ocultar para Usuários */}
          <Card>
            <CardHeader>
              <CardTitle>Ocultar Conteúdo</CardTitle>
              <CardDescription>
                Selecione usuários para ocultar este conteúdo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Users className="w-4 h-4 mr-2" />
                    Selecionar Usuários ({selectedUsers.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Selecionar Usuários</DialogTitle>
                    <DialogDescription>
                      Marque os usuários para os quais você deseja ocultar este conteúdo
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar usuários..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {filteredUsers.map(user => {
                        const isSelected = selectedUsers.includes(user.user_id);
                        const isAlreadyHidden = visibilityRules.some(rule => rule.user_id === user.user_id);
                        
                        return (
                          <div
                            key={user.user_id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                            } ${isAlreadyHidden ? 'opacity-50' : ''}`}
                            onClick={() => !isAlreadyHidden && toggleUserSelection(user.user_id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                                <p className="text-sm text-muted-foreground">
                                  Plano: {user.plan}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isAlreadyHidden && (
                                  <Badge variant="destructive">Já Oculto</Badge>
                                )}
                                {isSelected && !isAlreadyHidden && (
                                  <Badge>Selecionado</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {selectedUsers.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button onClick={hideContentFromUsers}>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Ocultar para {selectedUsers.length} usuário(s)
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedUsers([])}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Limpar Seleção
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usuários com Conteúdo Oculto */}
          <Card>
            <CardHeader>
              <CardTitle>Usuários com Conteúdo Oculto</CardTitle>
              <CardDescription>
                Usuários que não podem ver este conteúdo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {visibilityRules.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum usuário tem este conteúdo oculto
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Oculto em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibilityRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          {rule.profiles?.full_name || 'Usuário sem nome'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {rule.profiles?.plan || 'free'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(rule.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => showContentToUser(rule.id)}
                            title="Liberar conteúdo para este usuário"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Liberar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};