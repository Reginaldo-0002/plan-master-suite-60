import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  MessageSquare, 
  Bell, 
  Settings, 
  DollarSign, 
  BookOpen, 
  UserCog,
  LogOut,
  ArrowLeft,
  Shield
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'vip' | 'pro';
  role: 'user' | 'admin' | 'moderator';
  pix_key: string | null;
  total_session_time: number;
  areas_accessed: number;
  referral_code: string;
  referral_earnings: number;
  created_at: string;
  updated_at: string;
}

type ActiveAdminSection = 'dashboard' | 'users' | 'content' | 'support' | 'notifications' | 'tools' | 'financial' | 'rules' | 'team';

interface AdminSidebarProps {
  profile: Profile | null;
  activeSection: ActiveAdminSection;
  onSectionChange: (section: ActiveAdminSection) => void;
}

export const AdminSidebar = ({ profile, activeSection, onSectionChange }: AdminSidebarProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Gestão de Usuários', icon: Users },
    { id: 'content', label: 'Gestão de Conteúdo', icon: FileText },
    { id: 'support', label: 'Suporte/Chat', icon: MessageSquare },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'tools', label: 'Status de Ferramentas', icon: Settings },
    { id: 'financial', label: 'Gestão Financeira', icon: DollarSign },
    { id: 'rules', label: 'Editor de Regras', icon: BookOpen },
    { id: 'team', label: 'Gestão de Equipe', icon: UserCog },
  ];

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Painel Administrativo</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "A"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {profile?.full_name || "Administrador"}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {profile?.role || "admin"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={activeSection === item.id ? "secondary" : "ghost"}
              className="w-full justify-start gap-3 h-12"
              onClick={() => onSectionChange(item.id as ActiveAdminSection)}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </Button>
          );
        })}
      </nav>

      <Separator />

      {/* Footer */}
      <div className="p-4 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-12"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Voltar ao Painel</span>
        </Button>
        
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Sair</span>
        </Button>
      </div>
    </div>
  );
};