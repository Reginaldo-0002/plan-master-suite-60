import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RefreshCw, Eye, RotateCcw, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { WebhookEvent } from '@/types/integrations';

export function WebhookEvents() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<WebhookEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchTerm, statusFilter, providerFilter]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_events')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar eventos: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = events;

    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.idempotency_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(event.raw_payload).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter);
    }

    if (providerFilter !== 'all') {
      filtered = filtered.filter(event => event.provider === providerFilter);
    }

    setFilteredEvents(filtered);
  };

  const handleReprocess = async (eventId: string) => {
    try {
      // Reprocessar usando a RPC function que lida com toda a lógica
      const { data, error } = await supabase.rpc('process_webhook_event', {
        event_id: eventId
      });

      if (error) throw error;

      const result = data as any;
      
      if (result?.success) {
        toast({
          title: 'Sucesso',
          description: `Evento reprocessado! Plano ${result.plan} ativado até ${new Date(result.period_end).toLocaleDateString('pt-BR')}`,
          variant: 'default'
        });
      } else {
        throw new Error(result?.error || 'Falha no reprocessamento');
      }

      loadEvents();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao reprocessar evento: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      received: 'bg-blue-500',
      processed: 'bg-green-500',
      failed: 'bg-red-500',
      discarded: 'bg-gray-500'
    };
    return colors[status as keyof typeof colors] || colors.received;
  };

  const getProviderColor = (provider: string) => {
    const colors = {
      hotmart: 'bg-orange-500',
      kiwify: 'bg-green-500',
      caktor: 'bg-blue-500',
      generic: 'bg-gray-500'
    };
    return colors[provider as keyof typeof colors] || colors.generic;
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Webhooks Recebidos</h2>
          <p className="text-muted-foreground">
            Logs e monitoramento de eventos recebidos
          </p>
        </div>
        
        <Button onClick={loadEvents} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ID, payload, etc..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="received">Recebido</SelectItem>
                  <SelectItem value="processed">Processado</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                  <SelectItem value="discarded">Descartado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Plataforma</label>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="hotmart">Hotmart</SelectItem>
                  <SelectItem value="kiwify">Kiwify</SelectItem>
                  <SelectItem value="caktor">Caktor</SelectItem>
                  <SelectItem value="generic">Genérico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Ações</label>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setProviderFilter('all');
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Eventos */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos ({filteredEvents.length})</CardTitle>
          <CardDescription>
            Lista dos últimos eventos de webhook recebidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verificado</TableHead>
                <TableHead>Recebido em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {events.length === 0 ? 'Nenhum evento recebido ainda' : 'Nenhum evento encontrado com os filtros aplicados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-mono text-sm">
                      {event.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getProviderColor(event.provider)}`} />
                        <span className="capitalize">{event.provider}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={`text-white ${getStatusColor(event.status)}`}
                      >
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={event.verified ? 'default' : 'destructive'}>
                        {event.verified ? 'Sim' : 'Não'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(event.received_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedEvent(event)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle>Detalhes do Evento</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-[60vh]">
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-semibold">Informações Básicas</h4>
                                    <div className="space-y-2 text-sm">
                                      <p><strong>ID:</strong> {selectedEvent?.id}</p>
                                      <p><strong>Plataforma:</strong> {selectedEvent?.provider}</p>
                                      <p><strong>Status:</strong> {selectedEvent?.status}</p>
                                      <p><strong>Verificado:</strong> {selectedEvent?.verified ? 'Sim' : 'Não'}</p>
                                      <p><strong>Chave de Idempotência:</strong> {selectedEvent?.idempotency_key}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold">Timestamps</h4>
                                    <div className="space-y-2 text-sm">
                                      <p><strong>Recebido:</strong> {selectedEvent && new Date(selectedEvent.received_at).toLocaleString('pt-BR')}</p>
                                      <p><strong>Processado:</strong> {selectedEvent?.processed_at ? new Date(selectedEvent.processed_at).toLocaleString('pt-BR') : 'N/A'}</p>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold">Headers Brutos</h4>
                                  <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                                    {JSON.stringify(selectedEvent?.raw_headers, null, 2)}
                                  </pre>
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold">Payload Bruto</h4>
                                  <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                                    {JSON.stringify(selectedEvent?.raw_payload, null, 2)}
                                  </pre>
                                </div>
                                
                                {selectedEvent?.canonical_event && (
                                  <div>
                                    <h4 className="font-semibold">Evento Canônico</h4>
                                    <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                                      {JSON.stringify(selectedEvent.canonical_event, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                
                                {selectedEvent?.error_message && (
                                  <div>
                                    <h4 className="font-semibold">Erro</h4>
                                    <p className="text-red-600 text-sm">{selectedEvent.error_message}</p>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                        
                        {event.status === 'failed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReprocess(event.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}