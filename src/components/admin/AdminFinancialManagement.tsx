import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, Users, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  pix_key: string;
  status: string;
  created_at: string;
  processed_at: string | null;
}

interface FinancialStats {
  totalEarnings: number;
  pendingWithdrawals: number;
  processedWithdrawals: number;
  totalUsers: number;
}

export const AdminFinancialManagement = () => {
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    totalEarnings: 0,
    pendingWithdrawals: 0,
    processedWithdrawals: 0,
    totalUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    
    const channel = supabase
      .channel('financial-management')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'withdrawal_requests'
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      // Fetch withdrawal requests
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (withdrawalsError) throw withdrawalsError;

      // Fetch profiles for stats
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('referral_earnings');

      if (profilesError) throw profilesError;

      setWithdrawalRequests(withdrawals || []);

      // Calculate stats
      const totalEarnings = profiles?.reduce((sum, profile) => sum + (profile.referral_earnings || 0), 0) || 0;
      const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending').length || 0;
      const processedWithdrawals = withdrawals?.filter(w => w.status === 'processed').length || 0;
      const totalUsers = profiles?.length || 0;

      setStats({
        totalEarnings,
        pendingWithdrawals,
        processedWithdrawals,
        totalUsers
      });

    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados financeiros",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processWithdrawal = async (requestId: string, approve: boolean) => {
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({ 
          status: approve ? 'processed' : 'rejected',
          processed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Saque ${approve ? 'aprovado' : 'rejeitado'} com sucesso`,
      });
      
      fetchData();
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar saque",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestão Financeira</h2>
          <p className="text-muted-foreground">
            Monitore ganhos, saques e estatísticas financeiras
          </p>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ganhos Totais
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R$ {stats.totalEarnings.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saques Pendentes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.pendingWithdrawals}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saques Processados
            </CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.processedWithdrawals}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Usuários
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.totalUsers}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Requests Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Solicitações de Saque ({withdrawalRequests.length})</CardTitle>
          <CardDescription>
            Gerencie as solicitações de saque dos usuários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Chave PIX</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawalRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {request.user_id.slice(0, 8)}...
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">
                      R$ {request.amount.toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {request.pix_key}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(request.status)}>
                      {request.status === 'pending' ? 'Pendente' : 
                       request.status === 'processed' ? 'Processado' : 'Rejeitado'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(request.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => processWithdrawal(request.id, true)}
                          className="text-green-600 hover:text-green-700"
                        >
                          Aprovar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => processWithdrawal(request.id, false)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Rejeitar
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};