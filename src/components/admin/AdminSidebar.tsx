
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  MessageSquare, 
  Bell, 
  Wrench, 
  DollarSign,
  BookOpen,
  UserPlus,
  Settings,
  Calendar,
  ImageIcon,
  Shield,
  EyeOff,
  Activity
} from "lucide-react";

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const AdminSidebar = ({ activeTab, setActiveTab }: AdminSidebarProps) => {
  const menuItems = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics dos Usuários', icon: Activity },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'content', label: 'Conteúdo', icon: FileText },
    { id: 'content-visibility', label: 'Visibilidade', icon: EyeOff },
    { id: 'support', label: 'Suporte', icon: MessageSquare },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'tools', label: 'Ferramentas', icon: Wrench },
    { id: 'financial', label: 'Financeiro', icon: DollarSign },
    { id: 'rules', label: 'Regras', icon: BookOpen },
    { id: 'team', label: 'Equipe', icon: UserPlus },
    { id: 'referral-settings', label: 'Configurações de Indicação', icon: Settings },
    { id: 'upcoming-releases', label: 'Próximos Lançamentos', icon: Calendar },
    { id: 'carousel', label: 'Carrossel', icon: ImageIcon },
    { id: 'integrations', label: 'Integrações & Webhooks', icon: Settings },
    { id: 'security', label: 'Segurança', icon: Shield },
  ];

  return (
    <div className="w-64 bg-background border-r">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-foreground">Painel Admin</h2>
      </div>
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  activeTab === item.id && "bg-secondary"
                )}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
