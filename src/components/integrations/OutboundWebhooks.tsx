import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function OutboundWebhooks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhooks de Saída</CardTitle>
        <CardDescription>
          Funcionalidade temporariamente desabilitada
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Badge variant="secondary">Em Manutenção</Badge>
          <p className="text-muted-foreground mt-2">
            Esta funcionalidade está sendo atualizada e estará disponível em breve.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}