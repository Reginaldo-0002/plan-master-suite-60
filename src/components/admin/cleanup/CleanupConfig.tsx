
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";

interface CleanupConfigProps {
  keepAdmin: boolean;
  setKeepAdmin: (value: boolean) => void;
  confirmText: string;
  setConfirmText: (value: string) => void;
}

export const CleanupConfig = ({ 
  keepAdmin, 
  setKeepAdmin, 
  confirmText, 
  setConfirmText 
}: CleanupConfigProps) => {
  const isConfirmationValid = confirmText.trim() === 'DELETAR TUDO';

  return (
    <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
      <CardHeader>
        <CardTitle className="text-futuristic-primary flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Configurações de Segurança
        </CardTitle>
        <CardDescription>
          Configure as opções de segurança antes de executar qualquer limpeza do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Admin Protection */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="keep_admin"
              checked={keepAdmin}
              onCheckedChange={(checked) => setKeepAdmin(checked as boolean)}
            />
            <Label htmlFor="keep_admin" className="text-sm font-medium">
              Manter conta do administrador atual
            </Label>
            <Shield className="w-4 h-4 text-green-500" />
          </div>
          
          <Alert className={keepAdmin ? "border-green-500/20 bg-green-50/5" : "border-red-500/20 bg-red-50/5"}>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {keepAdmin 
                ? "✓ Sua conta de administrador será preservada durante a limpeza"
                : "⚠️ ATENÇÃO: Sua conta de administrador TAMBÉM será removida!"
              }
            </AlertDescription>
          </Alert>
        </div>

        {/* Confirmation Text */}
        <div className="space-y-3">
          <Label htmlFor="confirm_text" className="text-red-500 font-bold">
            Digite exatamente "DELETAR TUDO" para habilitar as operações:
          </Label>
          <Input
            id="confirm_text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETAR TUDO"
            className={`border-red-500 focus:border-red-600 transition-all duration-200 ${
              isConfirmationValid 
                ? 'bg-green-50 border-green-500 focus:border-green-600' 
                : confirmText && 'bg-red-50'
            }`}
          />
          
          {/* Status Indicator */}
          <div className="flex items-center gap-2 text-sm">
            {isConfirmationValid ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-600 font-medium">Operações de limpeza habilitadas</span>
              </>
            ) : confirmText ? (
              <>
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-500">Texto de confirmação incorreto</span>
              </>
            ) : (
              <>
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Digite o texto de confirmação para continuar</span>
              </>
            )}
          </div>
        </div>

        {/* Safety Warnings */}
        <Alert className="border-red-500/20 bg-red-50/5">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription>
            <h4 className="text-red-500 font-bold mb-2">⚠️ AVISOS IMPORTANTES:</h4>
            <ul className="text-sm text-red-400 space-y-1">
              <li>• Backup automático será criado antes da limpeza</li>
              <li>• Todas as ações são registradas nos logs do sistema</li>
              <li>• É OBRIGATÓRIO fazer backup manual antes de operações críticas</li>
              <li>• O sistema pode demorar alguns minutos para processar limpezas grandes</li>
              <li>• Digite exatamente "DELETAR TUDO" (sem aspas) para habilitar</li>
              <li>• Operações só funcionam com permissões de administrador</li>
              <li>• Esta operação é IRREVERSÍVEL - não há como desfazer</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* System Status */}
        <Alert className="border-blue-500/20 bg-blue-50/5">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription>
            <h4 className="text-blue-500 font-bold mb-2">ℹ️ STATUS DO SISTEMA:</h4>
            <ul className="text-sm text-blue-400 space-y-1">
              <li>• Sistema de limpeza: ✅ Operacional</li>
              <li>• Validações de segurança: ✅ Ativas</li>
              <li>• Logs de auditoria: ✅ Funcionando</li>
              <li>• Proteção de administrador: {keepAdmin ? '✅' : '❌'} {keepAdmin ? 'Ativa' : 'Desativada'}</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
