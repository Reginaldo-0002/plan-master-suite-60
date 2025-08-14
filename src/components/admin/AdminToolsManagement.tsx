
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, Settings, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ToolStatus {
  id: string;
  tool_name: string;
  status: string;
  message: string | null;
  scheduled_maintenance: any;
  created_at: string;
  updated_at: string;
}

export const AdminToolsManagement = () => {
  const [tools, setTools] = useState<ToolStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolStatus | null>(null);
  const [formData, setFormData] = useState({
    tool_name: "",
    status: "active",
    message: "",
    maintenance_start: "",
    maintenance_end: "",
    maintenance_description: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTools();
    
    const channel = supabase
      .channel('tools-management')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tool_status'
      }, () => {
        fetchTools();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTools = async () => {
    try {
      const { data, error } = await supabase
        .from('tool_status')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTools(data || []);
    } catch (error) {
      console.error('Error fetching tools:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar ferramentas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTool = async () => {
    try {
      // Verificar se existe um conteúdo correspondente
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('title')
        .eq('content_type', 'tool')
        .eq('title', formData.tool_name)
        .single();

      if (contentError || !contentData) {
        toast({
          title: "Erro",
          description: "Esta ferramenta não existe como conteúdo. Crie primeiro o conteúdo da ferramenta.",
          variant: "destructive",
        });
        return;
      }

      const scheduled_maintenance = formData.maintenance_start && formData.maintenance_end ? {
        start: formData.maintenance_start,
        end: formData.maintenance_end,
        description: formData.maintenance_description
      } : null;

      // Usar UPSERT para evitar conflitos de constraint única
      const { error } = await supabase
        .from('tool_status')
        .upsert({
          tool_name: formData.tool_name,
          status: formData.status,
          message: formData.message || null,
          scheduled_maintenance,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tool_name',
          ignoreDuplicates: false
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status da ferramenta salvo com sucesso",
      });
      
      setIsCreateDialogOpen(false);
      resetForm();
      // Real-time vai atualizar automaticamente
    } catch (error) {
      console.error('Error saving tool status:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar status da ferramenta",
        variant: "destructive",
      });
    }
  };

  const updateTool = async () => {
    if (!editingTool) return;

    try {
      const scheduled_maintenance = formData.maintenance_start && formData.maintenance_end ? {
        start: formData.maintenance_start,
        end: formData.maintenance_end,
        description: formData.maintenance_description
      } : null;

      const { error } = await supabase
        .from('tool_status')
        .update({
          status: formData.status,
          message: formData.message || null,
          scheduled_maintenance,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTool.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status da ferramenta atualizado com sucesso",
      });
      
      setEditingTool(null);
      resetForm();
      // Não precisa chamar fetchTools - real-time vai atualizar
    } catch (error) {
      console.error('Error updating tool:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da ferramenta",
        variant: "destructive",
      });
    }
  };

  const deleteTool = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta ferramenta?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tool_status')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Ferramenta excluída com sucesso",
      });
      
      fetchTools();
    } catch (error) {
      console.error('Error deleting tool:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir ferramenta",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (tool: ToolStatus) => {
    setEditingTool(tool);
    const maintenance = tool.scheduled_maintenance as any;
    setFormData({
      tool_name: tool.tool_name,
      status: tool.status,
      message: tool.message || "",
      maintenance_start: maintenance?.start || "",
      maintenance_end: maintenance?.end || "",
      maintenance_description: maintenance?.description || ""
    });
  };

  const resetForm = () => {
    setFormData({
      tool_name: "",
      status: "active",
      message: "",
      maintenance_start: "",
      maintenance_end: "",
      maintenance_description: ""
    });
    setEditingTool(null);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'offline': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'maintenance': return <Clock className="w-4 h-4" />;
      case 'offline': return <AlertTriangle className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const activeTools = tools.filter(t => t.status === 'active').length;
  const maintenanceTools = tools.filter(t => t.status === 'maintenance').length;
  const offlineTools = tools.filter(t => t.status === 'offline').length;

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Status de Ferramentas</h2>
          <p className="text-muted-foreground">
            Monitore e gerencie o status das ferramentas da plataforma
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Ferramenta
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
            <Settings className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {tools.length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ativas
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {activeTools}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Manutenção
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {maintenanceTools}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Offline
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {offlineTools}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Ferramentas ({tools.length})</CardTitle>
          <CardDescription>
            Lista de todas as ferramentas monitoradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ferramenta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Manutenção Programada</TableHead>
                <TableHead>Atualizado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tools.map((tool) => (
                <TableRow key={tool.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{tool.tool_name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(tool.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(tool.status)}
                        {tool.status.charAt(0).toUpperCase() + tool.status.slice(1)}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground max-w-xs truncate">
                      {tool.message || "Nenhuma mensagem"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {tool.scheduled_maintenance ? (
                      <div className="text-sm">
                        <div className="font-medium">
                          {new Date((tool.scheduled_maintenance as any).start).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-muted-foreground">
                          {(tool.scheduled_maintenance as any).description}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Nenhuma</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(tool.updated_at).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(tool)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTool(tool.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen || !!editingTool} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingTool(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTool ? 'Editar Ferramenta' : 'Nova Ferramenta'}
            </DialogTitle>
            <DialogDescription>
              {editingTool ? 'Atualize o status da ferramenta' : 'Configure uma nova ferramenta para monitoramento'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tool_name">Nome da Ferramenta</Label>
              <Input
                id="tool_name"
                value={formData.tool_name}
                onChange={(e) => setFormData({...formData, tool_name: e.target.value})}
                placeholder="Ex: API de Pagamentos"
              />
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="message">Mensagem (Opcional)</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="Mensagem sobre o status atual..."
              />
            </div>

            {formData.status === 'maintenance' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maintenance_start">Início da Manutenção</Label>
                    <Input
                      id="maintenance_start"
                      type="datetime-local"
                      value={formData.maintenance_start}
                      onChange={(e) => setFormData({...formData, maintenance_start: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maintenance_end">Fim da Manutenção</Label>
                    <Input
                      id="maintenance_end"
                      type="datetime-local"
                      value={formData.maintenance_end}
                      onChange={(e) => setFormData({...formData, maintenance_end: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="maintenance_description">Descrição da Manutenção</Label>
                  <Textarea
                    id="maintenance_description"
                    value={formData.maintenance_description}
                    onChange={(e) => setFormData({...formData, maintenance_description: e.target.value})}
                    placeholder="Descreva o que será realizado..."
                  />
                </div>
              </>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={editingTool ? updateTool : createTool} 
                className="flex-1"
              >
                <Settings className="w-4 h-4 mr-2" />
                {editingTool ? 'Atualizar' : 'Criar'} Ferramenta
              </Button>
              <Button variant="outline" onClick={() => {
                setIsCreateDialogOpen(false);
                setEditingTool(null);
                resetForm();
              }}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
