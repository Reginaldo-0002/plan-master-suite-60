import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Loader2, AlertTriangle, BarChart3 } from 'lucide-react';

export const AdminAreaTrackingManager = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClearHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_clear_area_tracking_history');

      if (error) {
        console.error('❌ Error clearing history:', error);
        throw error;
      }

      console.log('✅ History cleared:', data);
      
      const result = data as any;
      
      toast({
        title: "Histórico Limpo!",
        description: `${result?.records_deleted || 0} registros foram removidos com sucesso.`,
        duration: 5000,
      });
    } catch (error: any) {
      console.error('💥 Failed to clear history:', error);
      toast({
        title: "Erro ao Limpar Histórico",
        description: error.message || "Ocorreu um erro ao tentar limpar o histórico.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <BarChart3 className="w-5 h-5" />
          Gerenciar Histórico de Áreas Acessadas
        </CardTitle>
        <CardDescription>
          Limpe todo o histórico de áreas acessadas pelos usuários. Esta ação é irreversível.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-background/50 rounded-lg border border-muted">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Como Funciona
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>O sistema rastreia as áreas acessadas pelos usuários</li>
              <li>Cada área é contabilizada apenas uma vez por dia</li>
              <li>No dia seguinte, o contador de áreas acessadas volta a crescer</li>
              <li>Esta função limpa TODO o histórico e reseta os contadores</li>
              <li>Após limpar, os usuários começam do zero na próxima visita</li>
            </ul>
          </div>

          <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive font-medium">
              ATENÇÃO: Esta ação não pode ser desfeita! Todo o histórico será permanentemente removido.
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Limpando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar Todo o Histórico
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Confirmar Limpeza de Histórico
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>Você está prestes a REMOVER PERMANENTEMENTE:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Todo o histórico de áreas acessadas</li>
                    <li>Contadores de áreas de todos os usuários</li>
                    <li>Dados de tracking de navegação</li>
                  </ul>
                  <p className="font-semibold text-destructive mt-4">
                    Esta ação NÃO PODE ser desfeita!
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearHistory}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Sim, Limpar Tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};
