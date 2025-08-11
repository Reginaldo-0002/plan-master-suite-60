
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Calendar,
  Settings,
  Carousel,
  DollarSign,
  Wrench,
  UserCheck,
  Shield,
  Trash2,
  Bell,
  MessageSquare,
  BarChart3,
  BookOpen,
  Star
} from "lucide-react";

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const AdminSidebar = ({ activeTab, setActiveTab }: AdminSidebarProps) => {
  const menuItems = [
    {
      id: 'overview',
      label: 'Visão Geral',
      icon: LayoutDashboard,
      category: 'main'
    },
    {
      id: 'users',
      label: 'Usuários',
      icon: Users,
      category: 'management'
    },
    {
      id: 'content',
      label: 'Conteúdo',
      icon: FileText,
      category: 'management'
    },
    {
      id: 'upcoming-releases',
      label: 'Próximos Lançamentos',
      icon: Calendar,
      category: 'management'
    },
    {
      id: 'carousel',
      label: 'Carrossel',
      icon: Carousel,
      category: 'management'
    },
    {
      id: 'referral-settings',
      label: 'Configurar Indicações',
      icon: DollarSign,
      category: 'settings'
    },
    {
      id: 'tools',
      label: 'Ferramentas',
      icon: Wrench,
      category: 'settings'
    },
    {
      id: 'team',
      label: 'Equipe',
      icon: UserCheck,
      category: 'settings'
    },
    {
      id: 'rules',
      label: 'Regras',
      icon: BookOpen,
      category: 'settings'
    },
    {
      id: 'system-cleanup',
      label: 'Limpeza do Sistema',
      icon: Trash2,
      category: 'danger',
      className: 'text-red-500 hover:text-red-400'
    }
  ];

  const categories = [
    { id: 'main', label: 'Principal' },
    { id: 'management', label: 'Gestão' },
    { id: 'settings', label: 'Configurações' },
    { id: 'danger', label: 'Zona de Perigo' }
  ];

  return (
    <div className="w-64 bg-background/95 backdrop-blur-sm border-r border-border">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-futuristic-primary">
          Painel Admin
        </h2>
        <p className="text-sm text-muted-foreground">
          Gestão do Sistema
        </p>
      </div>
      
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-4">
          {categories.map((category) => {
            const items = menuItems.filter(item => item.category === category.id);
            if (items.length === 0) return null;
            
            return (
              <div key={category.id}>
                <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {category.label}
                </h4>
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.id}
                        variant={activeTab === item.id ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start text-left",
                          activeTab === item.id && "bg-futuristic-primary/10 text-futuristic-primary",
                          item.className
                        )}
                        onClick={() => setActiveTab(item.id)}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Button>
                    );
                  })}
                </div>
                {category.id !== 'danger' && <Separator className="my-3" />}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
