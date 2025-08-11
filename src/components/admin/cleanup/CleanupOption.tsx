
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trash2, LucideIcon, Shield, AlertTriangle } from "lucide-react";

interface CleanupOptionProps {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  onExecute: (id: string) => void;
  disabled: boolean;
  loading: boolean;
  progress?: string;
}

export const CleanupOption = ({
  id,
  label,
  description,
  icon: Icon,
  color,
  onExecute,
  disabled,
  loading,
  progress
}: CleanupOptionProps) => {
  const isHighRisk = id === 'all' || id === 'users';
  
  return (
    <Card className={`bg-background/60 backdrop-blur-sm border-futuristic-primary/20 ${
      isHighRisk ? 'border-red-500/30 bg-red-50/5' : ''
    }`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Icon className={`w-6 h-6 ${color}`} />
              {isHighRisk && (
                <AlertTriangle className="w-3 h-3 text-red-500 absolute -top-1 -right-1" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className={color}>{label}</CardTitle>
                {isHighRisk && (
                  <Shield className="w-4 h-4 text-red-500" aria-label="Operação de Alto Risco" />
                )}
              </div>
              <CardDescription className="text-sm">{description}</CardDescription>
              {loading && progress && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-muted-foreground">{progress}</div>
                  <Progress value={undefined} className="h-2" />
                </div>
              )}
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={() => onExecute(id)}
            disabled={disabled}
            className={`min-w-[120px] ${
              isHighRisk 
                ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20' 
                : 'bg-red-600 hover:bg-red-700'
            } disabled:opacity-50 transition-all duration-200`}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {loading ? 'Executando...' : 'Executar'}
          </Button>
        </div>
        
        {isHighRisk && (
          <div className="mt-3 p-3 bg-red-50/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-red-500 text-xs font-medium">
              <AlertTriangle className="w-3 h-3" />
              OPERAÇÃO DE ALTO RISCO
            </div>
            <p className="text-xs text-red-400 mt-1">
              Esta operação pode afetar significativamente o sistema. Certifique-se de ter backup.
            </p>
          </div>
        )}
      </CardHeader>
    </Card>
  );
};
