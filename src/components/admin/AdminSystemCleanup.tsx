
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Trash2, Database, Users, FileText, Archive, Shield } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CleanupLog {
  id: string;
  cleanup_type: string;
  affected_tables: string[] | null;
  records_deleted: number;
  executed_by: string;
  backup_created: boolean;
  backup_location: string | null;
  created_at: string;
}

export const AdminSystemCleanup = () => {
  const [logs, setLogs] = useState<CleanupLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmationText, setConfirmationText] = useState("");
  const [selectedCleanupType, setSelectedCleanupType] = useState("users");
  const [keepAdmin, setKeepAdmin] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { toast } = useToast();

  const cleanupTypes = [
    {
      id: 'users',
      label: 'Limpar Usuários',
      description: 'Remove todos os usuários (exceto admin se selecionado)',
      icon: Users,
      color: 'text-red-500',
      danger: 'high'
    },
    {
      id: 'content',
      label: 'Limpar Conteúdo',
      description: 'Remove todo o conteúdo, tópicos e recursos',
      icon: FileText,
      color: 'text-orange-500',
      danger: 'medium'
    },
    {
      id: 'logs',
      label: 'Limpar Logs',
      description: 'Remove logs de atividade, mensagens de suporte e notificações',
      icon: Archive,
      color: 'text-yellow-500',
      danger: 'low'
    },
    {
      id: 'all',
      label: 'RESET COMPLETO',
      description: 'Remove TUDO do sistema (IRREVERSÍVEL)',
      icon: Database,
      color: 'text-red-600',
      danger: 'critical'
    }
  ];

  useEffect(() => {
    fetchCleanupLogs();
  }, []);

  const fetchCleanupLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('system_cleanup_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching cleanup logs:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar logs de limpeza",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const executeCleanup = async () => {
    const selectedType = cleanupTypes.find(t => t.id === selectedCleanupType);
    const requiredText = `CONFIRMO LIMPEZA ${selectedType?.label.toUpperCase()}`;
    
    if (confirmationText !== requiredText) {
      toast({
        title: "Confirmação incorreta",
        description: `Digite exatamente: ${requiredText}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('system_cleanup', {
        cleanup_type: selectedCleanupType,
        keep_admin: keepAdmin
      });

      if (error) throw error;

      toast({
        title: "Limpeza executada",
        description: `${data.records_deleted} registros foram removidos`,
      });

      setShowConfirmation(false);
      setConfirmationText("");
      fetchCleanupLogs();
    } catch (error: any) {
      console.error('Error executing cleanup:', error);
      toast({
        title: "Erro na limpeza",
        description: error.message || "Erro ao executar limpeza do sistema",
        variant: "destructive",
      });
    }
  };

  const startCleanup = (type: string) => {
    setSelectedCleanupType(type);
    setShowConfirmation(true);
  };

  const getDangerBadge = (danger: string) => {
    switch (danger) {
      case 'low': return <Badge className="bg-yellow-500 text-white">Baixo Risco</Badge>;
      case 'medium': return <Badge className="bg-orange-500 text-white">Médio Risco</Badge>;
      case 'high': return <Badge className="bg-red-500 text-white">Alto Risco</Badge>;
      case 'critical': return <Badge className="bg-red-600 text-white">CRÍTICO</Badge>;
      default: return null;
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-red-500" />
        <div>
          <h2 className="text-2xl font-bold text-red-500">Limpeza do Sistema</h2>
          <p className="text-muted-foreground">⚠️ ATENÇÃO: Operações irreversíveis que podem apagar dados permanentemente</p>
        </div>
      </div>

      {/* Área de Limpeza */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cleanupTypes.map((type) => {
          const IconComponent = type.icon;
          return (
            <Card key={type.id} className="bg-background/60 backdrop-blur-sm border-red-500/20 hover:border-red-500/40 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconComponent className={`w-6 h-6 ${type.color}`} />
                    <div>
                      <CardTitle className={type.color}>{type.label}</CardTitle>
                      <CardDescription className="text-xs">{type.description}</CardDescription>
                    </div>
                  </div>
                  {getDangerBadge(type.danger)}
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => startCleanup(type.id)}
                  variant="destructive"
                  className="w-full"
                  disabled={type.danger === 'critical' && !confirm('Esta operação é IRREVERSÍVEL. Tem certeza?')}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Executar Limpeza
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal de Confirmação */}
      {showConfirmation && (
        <Card className="bg-red-50 border-red-500 dark:bg-red-950/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <div>
                <CardTitle className="text-red-500">Confirmação de Limpeza</CardTitle>
                <CardDescription>
                  Você está prestes a executar: <strong>{cleanupTypes.find(t => t.id === selectedCleanupType)?.label}</strong>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                <strong>ATENÇÃO:</strong> Esta operação é irreversível!
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                {cleanupTypes.find(t => t.id === selectedCleanupType)?.description}
              </p>
            </div>

            {selectedCleanupType !== 'logs' && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="keep_admin"
                  checked={keepAdmin}
                  onCheckedChange={setKeepAdmin}
                />
                <Label htmlFor="keep_admin" className="text-sm">
                  Manter conta de administrador
                </Label>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirmation">
                Para confirmar, digite exatamente: 
                <strong className="text-red-500 block mt-1">
                  CONFIRMO LIMPEZA {cleanupTypes.find(t => t.id === selectedCleanupType)?.label.toUpperCase()}
                </strong>
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Digite a confirmação..."
                className="border-red-300 focus:border-red-500"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={executeCleanup}
                variant="destructive"
                className="flex-1"
                disabled={confirmationText !== `CONFIRMO LIMPEZA ${cleanupTypes.find(t => t.id === selectedCleanupType)?.label.toUpperCase()}`}
              >
                Executar Limpeza
              </Button>
              <Button
                onClick={() => {
                  setShowConfirmation(false);
                  setConfirmationText("");
                }}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Limpezas */}
      <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
        <CardHeader>
          <CardTitle className="text-futuristic-primary">Histórico de Limpezas</CardTitle>
          <CardDescription>
            Registro das últimas operações de limpeza executadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma operação de limpeza executada ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {log.cleanup_type.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium">
                        {log.records_deleted} registros removidos
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss")}
                    </p>
                  </div>
                  <div className="text-right">
                    {log.backup_created && (
                      <Badge className="bg-green-500 text-white text-xs">
                        Backup criado
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
