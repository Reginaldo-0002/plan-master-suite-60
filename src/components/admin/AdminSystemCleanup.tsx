
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Trash2, Database, Users, FileText, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const AdminSystemCleanup = () => {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [keepAdmin, setKeepAdmin] = useState(true);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const { toast } = useToast();

  const cleanupOptions = [
    {
      id: 'users',
      label: 'Usuários',
      description: 'Remove todos os usuários (exceto admin se marcado)',
      icon: Users,
      color: 'text-red-500'
    },
    {
      id: 'content',
      label: 'Conteúdo',
      description: 'Remove todo o conteúdo, tópicos e recursos',
      icon: FileText,
      color: 'text-orange-500'
    },
    {
      id: 'logs',
      label: 'Logs e Histórico',
      description: 'Remove logs de atividade, suporte e notificações',
      icon: Database,
      color: 'text-yellow-500'
    },
    {
      id: 'all',
      label: 'RESET COMPLETO',
      description: 'Remove TUDO do sistema (exceto admin se marcado)',
      icon: RotateCcw,
      color: 'text-red-600'
    }
  ];

  const executeCleanup = async (cleanupType: string) => {
    if (confirmText !== 'DELETAR TUDO') {
      toast({
        title: "Erro",
        description: "Digite 'DELETAR TUDO' para confirmar",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`ÚLTIMA CONFIRMAÇÃO: Tem certeza absoluta que deseja executar ${cleanupType}? Esta ação é IRREVERSÍVEL!`)) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('system_cleanup', {
        cleanup_type: cleanupType,
        target_tables: selectedTables.length > 0 ? selectedTables : null,
        keep_admin: keepAdmin
      });

      if (error) throw error;

      // Safely parse the response
      let result;
      if (typeof data === 'object' && data !== null) {
        result = data as { success: boolean; records_deleted: number; cleanup_type: string };
      } else {
        // Fallback for unexpected response format
        result = { success: true, records_deleted: 0, cleanup_type: cleanupType };
      }

      toast({
        title: "Limpeza Executada",
        description: `${result.records_deleted} registros foram removidos`,
      });

      setConfirmText("");
      setSelectedTables([]);
    } catch (error: any) {
      console.error('Error during cleanup:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro durante a limpeza",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelection = (tableId: string, checked: boolean) => {
    if (checked) {
      setSelectedTables(prev => [...prev, tableId]);
    } else {
      setSelectedTables(prev => prev.filter(id => id !== tableId));
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-red-500/20 bg-red-50/5">
        <CardHeader>
          <CardTitle className="text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            ZONA DE PERIGO - Limpeza do Sistema
          </CardTitle>
          <CardDescription>
            Esta área permite remover dados do sistema de forma permanente. 
            <strong> ESTAS AÇÕES SÃO IRREVERSÍVEIS!</strong>
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {cleanupOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Card key={option.id} className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${option.color}`} />
                    <div>
                      <CardTitle className={option.color}>{option.label}</CardTitle>
                      <CardDescription>{option.description}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => executeCleanup(option.id)}
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Executar
                  </Button>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
        <CardHeader>
          <CardTitle className="text-futuristic-primary">Configurações de Segurança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="keep_admin"
              checked={keepAdmin}
              onCheckedChange={(checked) => setKeepAdmin(checked as boolean)}
            />
            <Label htmlFor="keep_admin">
              Manter conta do administrador atual (RECOMENDADO)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_text" className="text-red-500 font-bold">
              Digite "DELETAR TUDO" para confirmar qualquer limpeza:
            </Label>
            <Input
              id="confirm_text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETAR TUDO"
              className="border-red-500 focus:border-red-600"
            />
          </div>

          <div className="p-4 bg-red-50/10 border border-red-500/20 rounded-lg">
            <h4 className="text-red-500 font-bold mb-2">⚠️ AVISO IMPORTANTE:</h4>
            <ul className="text-sm text-red-400 space-y-1">
              <li>• Backup automático será criado antes da limpeza</li>
              <li>• Todas as ações são registradas nos logs do sistema</li>
              <li>• É recomendado fazer backup manual antes de operações críticas</li>
              <li>• O sistema pode demorar alguns minutos para processar limpezas grandes</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
