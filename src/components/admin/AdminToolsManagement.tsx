import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Edit2, AlertTriangle } from "lucide-react";
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
  const [toolsStatus, setToolsStatus] = useState<ToolStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolStatus | null>(null);
  const [formData, setFormData] = useState({
    status: "active",
    message: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchToolsStatus();
    
    const channel = supabase
      .channel('tools-management')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tool_status'
      }, () => {
        fetchToolsStatus();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchToolsStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('tool_status')
        .select('*')
        .order('tool_name', { ascending: true });

      if (error) throw error;
      setToolsStatus(data || []);
    } catch (error) {
      console.error('Error fetching tools status:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar status das ferramentas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateToolStatus = async () => {
    if (!selectedTool) return;

    try {
      const { error } = await supabase
        .from('tool_status')
        .update({
          status: formData.status,
          message: formData.message || null
        })
        .eq('id', selectedTool.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status da ferramenta atualizado com sucesso",
      });
      
      setIsEditDialogOpen(false);
      setSelectedTool(null);
      fetchToolsStatus();
    } catch (error) {
      console.error('Error updating tool status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da ferramenta",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (tool: ToolStatus) => {
    setSelectedTool(tool);
    setFormData({
      status: tool.status,
      message: tool.message || "",
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Settings className="w-4 h-4 text-green-600" />;
      case 'maintenance': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'inactive': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Settings className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Ferramentas</h2>
          <p className="text-muted-foreground">
            Monitore e gerencie o status das ferramentas da plataforma
          </p>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ferramentas Ativas
            </CardTitle>
            <Settings className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {toolsStatus.filter(t => t.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Manutenção
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {toolsStatus.filter(t => t.status === 'maintenance').length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inativas
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {toolsStatus.filter(t => t.status === 'inactive').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tools Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Ferramentas ({toolsStatus.length})</CardTitle>
          <CardDescription>
            Status e configurações das ferramentas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ferramenta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Última Atualização</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {toolsStatus.map((tool) => (
                <TableRow key={tool.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(tool.status)}
                      <div className="font-medium text-foreground">{tool.tool_name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(tool.status)}>
                      {tool.status === 'active' ? 'Ativa' : 
                       tool.status === 'maintenance' ? 'Manutenção' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground max-w-xs truncate">
                      {tool.message || "Sem mensagem"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(tool.updated_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(tool)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Status da Ferramenta</DialogTitle>
            <DialogDescription>
              Altere o status e mensagem da ferramenta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <select 
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full p-2 border rounded-md"
              >
                <option value="active">Ativa</option>
                <option value="maintenance">Manutenção</option>
                <option value="inactive">Inativa</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="message">Mensagem (opcional)</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="Mensagem sobre o status da ferramenta..."
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={updateToolStatus} className="flex-1">
                Salvar Alterações
              </Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};