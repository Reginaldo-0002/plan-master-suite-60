import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, Users, CreditCard, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  pix_key: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  profiles?: {
    full_name: string | null;
  };
}

interface FinancialStats {
  totalEarnings: number;
  pendingWithdrawals: number;
  processedWithdrawals: number;
  totalUsers: number;
  totalWithdrawalValue: number;
  pendingWithdrawalValue: number;
}

export const AdminFinancialManagement = () => {
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    totalEarnings: 0,
    pendingWithdrawals: 0,
    processedWithdrawals: 0,
    totalUsers: 0,
    totalWithdrawalValue: 0,
    pendingWithdrawalValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState("");
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
      // Fetch withdrawal requests with user info
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      if (withdrawalsError) throw withdrawalsError;

      // Fetch profiles for stats
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('referral_earnings');

      if (profilesError) throw profilesError;

      setWithdrawalRequests(withdrawals || []);

      // Calculate comprehensive stats
      const totalEarnings = profiles?.reduce((sum, profile) => sum + (profile.referral_earnings || 0), 0) || 0;
      const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending').length || 0;
      const processedWithdrawals = withdrawals?.filter(w => w.status === 'processed').length || 0;
      const totalUsers = profiles?.length || 0;
      const totalWithdrawalValue = withdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;
      const pendingWithdrawalValue = withdrawals?.filter(w => w.status === 'pending').reduce((sum, w) => sum + Number(w.amount), 0) || 0;

      setStats({
        totalEarnings: Number(totalEarnings),
        pendingWithdrawals,
        processedWithdrawals,
        totalUsers,
        totalWithdrawalValue,
        pendingWithdrawalValue
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

  const processWithdrawal = async () => {
    if (!selectedRequest) return;

    try {
      const updateData: any = {
        status: processingAction === 'approve' ? 'processed' : 'rejected',
        processed_at: new Date().toISOString()
      };

      if (processingAction === 'reject' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('withdrawal_requests')
        .update(updateData)
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // If approved, deduct from user's earnings
      if (processingAction === 'approve') {
        // First get the current earnings
        const { data: profileData, error: profileFetchError } = await supabase
          .from('profiles')
          .select('referral_earnings')
          .eq('user_id', selectedRequest.user_id)
          .single();

        if (profileFetchError) throw profileFetchError;

        const currentEarnings = profileData?.referral_earnings || 0;
        const newEarnings = Math.max(0, Number(currentEarnings) - selectedRequest.amount);

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            referral_earnings: newEarnings
          })
          .eq('user_id', selectedRequest.user_id);

        if (profileError) throw profileError;
      }

      toast({
        title: "Sucesso",
        description: `Saque ${processingAction === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso`,
      });
      
      setIsProcessDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason("");
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

  const exportFinancialData = () => {
    const csvData = withdrawalRequests.map(request => ({
      'Data': new Date(request.created_at).toLocaleDateString('pt-BR'),
      'Usuário': request.profiles?.full_name || 'N/A',
      'Valor': `R$ ${request.amount.toFixed(2)}`,
      'Chave PIX': request.pix_key,
      'Status': request.status === 'pending' ? 'Pendente' : request.status === 'processed' ? 'Processado' : 'Rejeitado',
      'Processado em': request.processed_at ? new Date(request.processed_at).toLocaleDateString('pt-BR') : 'N/A'
    }));

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Sucesso",
      description: "Relatório exportado com sucesso",
    });
  };

  const openDetailsDialog = (request: WithdrawalRequest) => {
    setSelectedRequest(request);
    setIsDetailsDialogOpen(true);
  };

  const openProcessDialog = (request: WithdrawalRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setProcessingAction(action);
    setIsProcessDialogOpen(true);
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
        <Button onClick={exportFinancialData} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
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
            <div className="text-xs text-muted-foreground">
              R$ {stats.pendingWithdrawalValue.toFixed(2)}
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

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Volume Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R$ {stats.totalWithdrawalValue.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Pendente
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R$ {stats.pendingWithdrawalValue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

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
                    <div>
                      <div className="font-medium text-foreground">
                        {request.profiles?.full_name || "Sem nome"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {request.user_id.slice(0, 8)}...
                      </div>
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
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetailsDialog(request)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {request.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openProcessDialog(request, 'approve')}
                            className="text-green-600 hover:text-green-700"
                          >
                            Aprovar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openProcessDialog(request, 'reject')}
                            className="text-red-600 hover:text-red-700"
                          >
                            Rejeitar
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>
              Informações completas da solicitação de saque
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Usuário:</strong>
                  <div>{selectedRequest.profiles?.full_name || "Sem nome"}</div>
                </div>
                <div>
                  <strong>Valor:</strong>
                  <div>R$ {selectedRequest.amount.toFixed(2)}</div>
                </div>
                <div className="col-span-2">
                  <strong>Chave PIX:</strong>
                  <div className="break-all">{selectedRequest.pix_key}</div>
                </div>
                <div>
                  <strong>Status:</strong>
                  <div>
                    <Badge className={getStatusBadgeColor(selectedRequest.status)}>
                      {selectedRequest.status === 'pending' ? 'Pendente' : 
                       selectedRequest.status === 'processed' ? 'Processado' : 'Rejeitado'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <strong>Criado em:</strong>
                  <div>{new Date(selectedRequest.created_at).toLocaleString('pt-BR')}</div>
                </div>
                {selectedRequest.processed_at && (
                  <div className="col-span-2">
                    <strong>Processado em:</strong>
                    <div>{new Date(selectedRequest.processed_at).toLocaleString('pt-BR')}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {processingAction === 'approve' ? 'Aprovar' : 'Rejeitar'} Saque
            </DialogTitle>
            <DialogDescription>
              {processingAction === 'approve' 
                ? 'Confirme a aprovação desta solicitação de saque'
                : 'Forneça um motivo para a rejeição desta solicitação'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRequest && (
              <div className="p-4 border rounded-lg">
                <div className="text-sm">
                  <strong>Valor:</strong> R$ {selectedRequest.amount.toFixed(2)}<br />
                  <strong>Usuário:</strong> {selectedRequest.profiles?.full_name || "Sem nome"}<br />
                  <strong>PIX:</strong> {selectedRequest.pix_key}
                </div>
              </div>
            )}
            
            {processingAction === 'reject' && (
              <div>
                <Label htmlFor="rejection-reason">Motivo da Rejeição</Label>
                <Input
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Informe o motivo da rejeição..."
                />
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={processWithdrawal} 
                className="flex-1"
                variant={processingAction === 'approve' ? 'default' : 'destructive'}
              >
                {processingAction === 'approve' ? 'Aprovar Saque' : 'Rejeitar Saque'}
              </Button>
              <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
