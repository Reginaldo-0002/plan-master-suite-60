
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, Settings, Trash2, Plus } from "lucide-react";

interface AutoStatusSchedule {
  id: string;
  tool_name: string;
  target_status: string;
  schedule_type: string;
  schedule_value: number;
  next_execution: string;
  is_active: boolean;
  created_at: string;
}

interface ToolStatus {
  id: string;
  tool_name: string;
  status: string;
  message: string | null;
}

export const AdminAutoStatusControl = () => {
  const [schedules, setSchedules] = useState<AutoStatusSchedule[]>([]);
  const [toolStatuses, setToolStatuses] = useState<ToolStatus[]>([]);
  const [newSchedule, setNewSchedule] = useState({
    tool_name: "",
    target_status: "active",
    schedule_type: "hours",
    schedule_value: 1
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSchedules();
    fetchToolStatuses();
  }, []);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('auto_status_schedules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const fetchToolStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('tool_status')
        .select('*')
        .order('tool_name');

      if (error) throw error;
      setToolStatuses(data || []);
    } catch (error) {
      console.error('Error fetching tool statuses:', error);
    }
  };

  const calculateNextExecution = (scheduleType: string, scheduleValue: number) => {
    const now = new Date();
    let nextExecution = new Date(now);

    switch (scheduleType) {
      case 'minutes':
        nextExecution.setMinutes(now.getMinutes() + scheduleValue);
        break;
      case 'hours':
        nextExecution.setHours(now.getHours() + scheduleValue);
        break;
      case 'days':
        nextExecution.setDate(now.getDate() + scheduleValue);
        break;
    }

    return nextExecution;
  };

  const createSchedule = async () => {
    if (!newSchedule.tool_name) {
      toast({
        title: "Erro",
        description: "Selecione uma ferramenta",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const nextExecution = calculateNextExecution(newSchedule.schedule_type, newSchedule.schedule_value);

      const { error } = await supabase
        .from('auto_status_schedules')
        .insert({
          ...newSchedule,
          next_execution: nextExecution.toISOString()
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Agendamento automático criado com sucesso",
      });

      setNewSchedule({
        tool_name: "",
        target_status: "active",
        schedule_type: "hours",
        schedule_value: 1
      });

      fetchSchedules();
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar agendamento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSchedule = async (scheduleId: string, isActive: boolean) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('auto_status_schedules')
        .update({ is_active: !isActive })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Agendamento ${!isActive ? 'ativado' : 'desativado'} com sucesso`,
      });

      fetchSchedules();
    } catch (error) {
      console.error('Error toggling schedule:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar agendamento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('auto_status_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Agendamento excluído com sucesso",
      });

      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir agendamento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateToolStatus = async (toolName: string, status: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tool_status')
        .upsert({
          tool_name: toolName,
          status: status,
          message: status === 'maintenance' ? 'Manutenção programada' : null
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status da ferramenta atualizado",
      });

      fetchToolStatuses();
    } catch (error) {
      console.error('Error updating tool status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'maintenance': return 'Manutenção';
      case 'blocked': return 'Bloqueado';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Manual das Ferramentas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Status Manual das Ferramentas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {toolStatuses.map((tool) => (
              <div key={tool.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{tool.tool_name}</p>
                  <Badge className={getStatusBadgeColor(tool.status)}>
                    {getStatusLabel(tool.status)}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={tool.status === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateToolStatus(tool.tool_name, 'active')}
                    disabled={isLoading}
                  >
                    Ativo
                  </Button>
                  <Button
                    variant={tool.status === 'maintenance' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateToolStatus(tool.tool_name, 'maintenance')}
                    disabled={isLoading}
                  >
                    Manutenção
                  </Button>
                  <Button
                    variant={tool.status === 'blocked' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => updateToolStatus(tool.tool_name, 'blocked')}
                    disabled={isLoading}
                  >
                    Bloqueado
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Criar Novo Agendamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Criar Agendamento Automático
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tool-name">Ferramenta</Label>
              <Select value={newSchedule.tool_name} onValueChange={(value) => setNewSchedule({...newSchedule, tool_name: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma ferramenta" />
                </SelectTrigger>
                <SelectContent>
                  {toolStatuses.map((tool) => (
                    <SelectItem key={tool.id} value={tool.tool_name}>
                      {tool.tool_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="target-status">Status Alvo</Label>
              <Select value={newSchedule.target_status} onValueChange={(value) => setNewSchedule({...newSchedule, target_status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="schedule-value">Intervalo</Label>
              <Input
                id="schedule-value"
                type="number"
                min="1"
                value={newSchedule.schedule_value}
                onChange={(e) => setNewSchedule({...newSchedule, schedule_value: parseInt(e.target.value) || 1})}
              />
            </div>
            <div>
              <Label htmlFor="schedule-type">Unidade</Label>
              <Select value={newSchedule.schedule_type} onValueChange={(value) => setNewSchedule({...newSchedule, schedule_type: value})}>
                <SelectTrigger>
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

          <Button
            onClick={createSchedule}
            disabled={isLoading || !newSchedule.tool_name}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Agendamento
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Agendamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos Automáticos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-medium">{schedule.tool_name}</p>
                    <Badge className={getStatusBadgeColor(schedule.target_status)}>
                      {getStatusLabel(schedule.target_status)}
                    </Badge>
                    <Badge variant={schedule.is_active ? "secondary" : "outline"}>
                      {schedule.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A cada {schedule.schedule_value} {schedule.schedule_type === 'minutes' ? 'minutos' : schedule.schedule_type === 'hours' ? 'horas' : 'dias'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Próxima execução: {new Date(schedule.next_execution).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={schedule.is_active}
                    onCheckedChange={() => toggleSchedule(schedule.id, schedule.is_active)}
                    disabled={isLoading}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteSchedule(schedule.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {schedules.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Nenhum agendamento automático configurado
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
