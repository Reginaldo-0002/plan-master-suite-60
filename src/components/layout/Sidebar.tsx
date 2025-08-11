import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Profile } from "@/types/profile";
import {
  LayoutDashboard,
  Package,
  Wrench,
  GraduationCap,
  BookOpen,
  Settings,
  LogOut,
  Crown,
  Gem,
  Star,
  FileText,
  Calendar,
  Images
} from "lucide-react";

type ActiveSection = "dashboard" | "products" | "tools" | "courses" | "tutorials" | "profile" | "rules" | "coming-soon" | "carousel" | "settings";

interface SidebarProps {
  profile: Profile | null;
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
}

export const Sidebar = memo(({ profile, activeSection, onSectionChange }: SidebarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      navigate("/auth");
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'pro':
        return <Crown className="w-4 h-4" />;
      case 'vip':
        return <Gem className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'bg-plan-pro text-white';
      case 'vip':
        return 'bg-plan-vip text-white';
      default:
        return 'bg-plan-free text-white';
    }
  };

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'products', icon: Package, label: 'Produtos' },
    { id: 'tools', icon: Wrench, label: 'Ferramentas' },
    { id: 'courses', icon: GraduationCap, label: 'Cursos' },
    { id: 'tutorials', icon: BookOpen, label: 'Tutoriais' },
    { id: 'rules', icon: FileText, label: 'Regras' },
    { id: 'coming-soon', icon: Calendar, label: 'Em Breve' },
    { id: 'carousel', icon: Images, label: 'Carrossel' },
  ];

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col relative z-20">
      {/* Header */}
      <div className="p-6 border-b border-border bg-gradient-to-b from-card/90 to-card backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="gradient-primary text-primary-foreground">
              {profile?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {profile?.full_name || 'Usuário'}
            </p>
            <Badge className={`text-xs ${getPlanColor(profile?.plan || 'free')}`}>
              {getPlanIcon(profile?.plan || 'free')}
              <span className="ml-1 uppercase">{profile?.plan || 'free'}</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 bg-card/50 backdrop-blur-sm">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={activeSection === item.id ? "default" : "ghost"}
            size="sm"
            className={`w-full justify-start transition-all duration-300 ${
              activeSection === item.id 
                ? 'gradient-primary text-primary-foreground shadow-lg animate-glow' 
                : 'text-foreground hover:bg-accent hover:text-accent-foreground border border-transparent hover:border-primary/20'
            }`}
            onClick={() => onSectionChange(item.id as ActiveSection)}
          >
            <item.icon className="w-4 h-4 mr-3" />
            {item.label}
          </Button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2 bg-card/50 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-foreground hover:bg-accent hover:text-accent-foreground border border-transparent hover:border-primary/20 transition-all duration-300"
          onClick={() => onSectionChange('settings')}
        >
          <Settings className="w-4 h-4 mr-3" />
          Configurações
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20 transition-all duration-300"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sair
        </Button>
      </div>
    </div>
  );
});