
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  MessageSquare, 
  Settings, 
  TrendingUp,
  Bell,
  Shield,
  Wrench,
  MonitorSpeaker,
  DollarSign,
  Rocket,
  Database,
  Calendar,
  ChevronDown,
  ChevronRight
} from "lucide-react";

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const AdminSidebar = ({ activeTab, setActiveTab }: AdminSidebarProps) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['main', 'content', 'system']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const menuSections = [
    {
      id: 'main',
      title: 'Principal',
      items: [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'users', label: 'Usuários', icon: Users },
        { id: 'financials', label: 'Financeiro', icon: TrendingUp }
      ]
    },
    {
      id: 'content',
      title: 'Gestão de Conteúdo',
      items: [
        { id: 'content', label: 'Conteúdos', icon: FileText },
        { id: 'upcoming-releases', label: 'Próximos Lançamentos', icon: Rocket, badge: 'NOVO' },
        { id: 'carousel', label: 'Carrossel', icon: MonitorSpeaker },
        { id: 'notifications', label: 'Notificações', icon: Bell }
      ]
    },
    {
      id: 'monetization',
      title: 'Monetização',
      items: [
        { id: 'referral-settings', label: 'Config. Indicações', icon: DollarSign, badge: 'NOVO' },
        { id: 'tools', label: 'Ferramentas', icon: Wrench }
      ]
    },
    {
      id: 'support',
      title: 'Suporte & Comunicação',
      items: [
        { id: 'support', label: 'Suporte', icon: MessageSquare },
        { id: 'chat', label: 'Chat Admin', icon: MessageSquare },
        { id: 'team', label: 'Equipe', icon: Users }
      ]
    },
    {
      id: 'system',
      title: 'Sistema',
      items: [
        { id: 'auto-status', label: 'Status Automático', icon: Settings },
        { id: 'rules', label: 'Regras', icon: Shield },
        { id: 'system-cleanup', label: 'Limpeza Sistema', icon: Database, badge: 'PERIGO', badgeColor: 'destructive' }
      ]
    }
  ];

  return (
    <div className="w-64 bg-background border-r border-border">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-bold text-futuristic-primary">Admin Panel</h2>
        <p className="text-sm text-muted-foreground">Gestão completa do sistema</p>
      </div>
      
      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="p-4 space-y-4">
          {menuSections.map((section) => (
            <div key={section.id} className="space-y-2">
              <Button
                variant="ghost"
                onClick={() => toggleSection(section.id)}
                className="w-full justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {section.title}
                {expandedSections.includes(section.id) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
              
              {expandedSections.includes(section.id) && (
                <div className="space-y-1 ml-2">
                  {section.items.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <Button
                        key={item.id}
                        variant={activeTab === item.id ? "secondary" : "ghost"}
                        className="w-full justify-start text-sm"
                        onClick={() => setActiveTab(item.id)}
                      >
                        <IconComponent className="w-4 h-4 mr-2" />
                        {item.label}
                        {item.badge && (
                          <Badge 
                            variant={item.badgeColor || "default"} 
                            className="ml-auto text-xs"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          <p>Sistema Admin v2.0</p>
          <p>Gestão Completa</p>
        </div>
      </div>
    </div>
  );
};
