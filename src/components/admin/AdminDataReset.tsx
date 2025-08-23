import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, UserX, RotateCcw, AlertTriangle, Database } from "lucide-react";

interface User {
  user_id: string;
  full_name: string;
  user_email: string;
  plan: string;
  role: string;
}

interface AdminDataResetProps {
  users: User[];
  onUserReset?: () => void;
}

export const AdminDataReset = ({ users, onUserReset }: AdminDataResetProps) => {
  const [isResetting, setIsResetting] = useState<string | null>(null);
  const { toast } = useToast();

  const handleResetUserData = async (userId: string, userName: string) => {
    setIsResetting(userId);
    
    try {
      console.log('🔄 Iniciando reset de dados para usuário:', userId);
      
      const { data, error } = await supabase.rpc('admin_reset_user_data', {
        target_user_id: userId
      });

      if (error) {
        console.error('❌ Erro no reset:', error);
        throw error;
      }

      console.log('✅ Reset concluído:', data);

      toast({
        title: "✅ Reset Concluído",
        description: `Todos os dados de ${userName} foram resetados com sucesso.`,
        duration: 5000,
      });

      onUserReset?.();
    } catch (error: any) {
      console.error('❌ Erro ao resetar dados:', error);
      toast({
        title: "❌ Erro no Reset",
        description: error.message || "Erro ao resetar dados do usuário",
        variant: "destructive",
      });
    } finally {
      setIsResetting(null);
    }
  };

  const handleTestContentAccess = async () => {
    try {
      console.log('🧪 Testando acesso a conteúdo para todos os usuários...');
      
      // Buscar conteúdo de diferentes planos
      const { data: content, error: contentError } = await supabase
        .from('content')
        .select('id, title, required_plan, status, is_active')
        .eq('is_active', true)
        .eq('status', 'published');

      if (contentError) throw contentError;

      const contentByPlan = {
        free: content?.filter(c => c.required_plan === 'free') || [],
        vip: content?.filter(c => c.required_plan === 'vip') || [],
        pro: content?.filter(c => c.required_plan === 'pro') || []
      };

      console.log('📊 Análise de Conteúdo:', {
        total: content?.length || 0,
        porPlano: {
          free: contentByPlan.free.length,
          vip: contentByPlan.vip.length,
          pro: contentByPlan.pro.length
        },
        usuarios: users.map(u => ({ 
          nome: u.full_name, 
          plano: u.plan,
          podeVer: {
            free: contentByPlan.free.length,
            vip: ['vip', 'pro'].includes(u.plan) ? contentByPlan.vip.length : 0,
            pro: u.plan === 'pro' ? contentByPlan.pro.length : 0
          }
        }))
      });

      toast({
        title: "✅ Teste de Acesso Concluído",
        description: `Analisados ${content?.length || 0} conteúdos. Verifique o console para detalhes completos.`,
        duration: 7000,
      });
      
    } catch (error: any) {
      console.error('❌ Erro no teste:', error);
      toast({
        title: "❌ Erro no Teste",
        description: error.message || "Erro ao testar acesso a conteúdo",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          Reset de Dados dos Usuários
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          <strong>⚠️ ATENÇÃO:</strong> Esta ação é <strong>IRREVERSÍVEL</strong> e irá:
        </p>
        <ul className="text-sm text-muted-foreground ml-4 space-y-1">
          <li>• Deletar todas as sessões do usuário</li>
          <li>• Limpar todo o histórico de atividades</li>
          <li>• Remover todos os tickets de suporte</li>
          <li>• Deletar todas as indicações (referrals)</li>
          <li>• Resetar estatísticas e pontos</li>
          <li>• Voltar o plano para FREE</li>
          <li>• <strong>Manter apenas os dados básicos do perfil</strong></li>
        </ul>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {users.slice(0, 10).map((user) => (
            <div key={user.user_id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="font-medium">{user.full_name || 'Nome não informado'}</span>
                  <span className="text-sm text-muted-foreground">{user.user_email}</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant={user.plan === 'pro' ? 'default' : user.plan === 'vip' ? 'secondary' : 'outline'}>
                    {user.plan.toUpperCase()}
                  </Badge>
                  {user.role === 'admin' && (
                    <Badge variant="destructive" className="text-xs">
                      ADMIN
                    </Badge>
                  )}
                </div>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isResetting === user.user_id || user.role === 'admin'}
                    className="gap-2"
                  >
                    {isResetting === user.user_id ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin" />
                        Resetando...
                      </>
                    ) : (
                      <>
                        <UserX className="w-4 h-4" />
                        Reset
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      Confirmar Reset de Dados
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        Você está prestes a <strong>RESETAR COMPLETAMENTE</strong> todos os dados de:
                      </p>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="font-semibold">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground">{user.user_email}</p>
                        <p className="text-sm">Plano atual: <Badge variant="outline">{user.plan.toUpperCase()}</Badge></p>
                      </div>
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-sm font-medium text-destructive mb-2">⚠️ Esta ação é IRREVERSÍVEL e irá:</p>
                        <ul className="text-xs text-destructive space-y-1">
                          <li>• Deletar TODAS as sessões e atividades</li>
                          <li>• Remover TODOS os tickets de suporte</li>
                          <li>• Limpar TODAS as estatísticas</li>
                          <li>• Resetar plano para FREE</li>
                          <li>• Manter apenas dados básicos do perfil</li>
                        </ul>
                      </div>
                      <p className="text-sm font-medium">
                        Digite <code className="bg-muted px-1 rounded">CONFIRMAR</code> abaixo para continuar:
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleResetUserData(user.user_id, user.full_name)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      SIM, RESETAR TUDO
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
        
        {users.length > 10 && (
          <p className="text-sm text-muted-foreground text-center">
            Mostrando 10 usuários. Total: {users.length}
          </p>
        )}
        
        {users.length === 0 && (
          <div className="text-center py-8">
            <UserX className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhum usuário encontrado</p>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-info/10 border border-info/20 rounded-lg">
          <h4 className="font-medium mb-2 text-info">🧪 Teste de Visualização de Conteúdo</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Use este botão para verificar se todos os usuários conseguem visualizar conteúdo adequado ao seu plano.
          </p>
          <Button
            onClick={handleTestContentAccess}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Database className="w-4 h-4" />
            Testar Acesso a Conteúdo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};