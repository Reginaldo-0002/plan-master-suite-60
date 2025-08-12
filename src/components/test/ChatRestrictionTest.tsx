import React from 'react';
import { useChatRestrictions } from '@/hooks/useChatRestrictions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Componente de teste para verificar se o hook detecta bloqueios
export const ChatRestrictionTest = () => {
  // Testar com o ID da usuária Maiara que está bloqueada
  const maiaraUserId = '2ff46b80-307b-4e34-b523-127f6dafaa07';
  const { restriction, loading } = useChatRestrictions(maiaraUserId);

  return (
    <Card className="w-96 m-4">
      <CardHeader>
        <CardTitle>Teste de Restrições - Maiara dos Santos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p><strong>User ID:</strong> {maiaraUserId}</p>
          <p><strong>Loading:</strong> {loading ? 'Sim' : 'Não'}</p>
          <p><strong>Está bloqueado:</strong> {restriction.isBlocked ? 'SIM' : 'NÃO'}</p>
          <p><strong>Motivo:</strong> {restriction.reason || 'N/A'}</p>
          <p><strong>Bloqueado até:</strong> {restriction.blockedUntil ? restriction.blockedUntil.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'N/A'}</p>
        </div>
      </CardContent>
    </Card>
  );
};