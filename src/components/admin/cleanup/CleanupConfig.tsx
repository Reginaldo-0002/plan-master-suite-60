
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
            Manter conta do administrador atual (ALTAMENTE RECOMENDADO)
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_text" className="text-red-500 font-bold">
            Digite exatamente "DELETAR TUDO" para habilitar as operações:
          </Label>
          <Input
            id="confirm_text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETAR TUDO"
            className={`border-red-500 focus:border-red-600 ${
              isConfirmationValid ? 'bg-green-50 border-green-500' : ''
            }`}
          />
          {isConfirmationValid && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              ✓ Operações de limpeza habilitadas
            </p>
          )}
          {confirmText && !isConfirmationValid && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              ✗ Texto de confirmação incorreto
            </p>
          )}
        </div>

        <div className="p-4 bg-red-50/10 border border-red-500/20 rounded-lg">
          <h4 className="text-red-500 font-bold mb-2">⚠️ AVISOS IMPORTANTES:</h4>
          <ul className="text-sm text-red-400 space-y-1">
            <li>• Backup automático será criado antes da limpeza</li>
            <li>• Todas as ações são registradas nos logs do sistema</li>
            <li>• É OBRIGATÓRIO fazer backup manual antes de operações críticas</li>
            <li>• O sistema pode demorar alguns minutos para processar limpezas grandes</li>
            <li>• Digite exatamente "DELETAR TUDO" (sem aspas) para habilitar</li>
            <li>• Operações só funcionam com permissões de administrador</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
