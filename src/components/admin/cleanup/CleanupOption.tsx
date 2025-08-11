
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, LucideIcon } from "lucide-react";

interface CleanupOptionProps {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  onExecute: (id: string) => void;
  disabled: boolean;
  loading: boolean;
}

export const CleanupOption = ({
  id,
  label,
  description,
  icon: Icon,
  color,
  onExecute,
  disabled,
  loading
}: CleanupOptionProps) => {
  return (
    <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className={`w-6 h-6 ${color}`} />
            <div>
              <CardTitle className={color}>{label}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={() => onExecute(id)}
            disabled={disabled}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {loading ? 'Executando...' : 'Executar'}
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
};
