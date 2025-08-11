
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminDashboardContent } from "@/components/admin/AdminDashboardContent";
import { AdminUserManagement } from "@/components/admin/AdminUserManagement";
import { AdminContentManagement } from "@/components/admin/AdminContentManagement";
import { AdminSupportManagement } from "@/components/admin/AdminSupportManagement";
import { AdminNotificationManagement } from "@/components/admin/AdminNotificationManagement";
import { AdminToolsManagement } from "@/components/admin/AdminToolsManagement";
import { AdminFinancialManagement } from "@/components/admin/AdminFinancialManagement";
import { AdminRulesEditor } from "@/components/admin/AdminRulesEditor";
import { AdminTeamManagement } from "@/components/admin/AdminTeamManagement";
import { AdminReferralSettings } from "@/components/admin/AdminReferralSettings";
import { AdminUpcomingReleases } from "@/components/admin/AdminUpcomingReleases";
import { AdminSystemCleanup } from "@/components/admin/AdminSystemCleanup";
import { AdminCarouselManagement } from "@/components/admin/AdminCarouselManagement";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdvancedUserManagement } from "@/components/admin/AdvancedUserManagement";

type ActiveAdminSection = 'overview' | 'users' | 'content' | 'support' | 'notifications' | 'tools' | 'financial' | 'rules' | 'team' | 'referral-settings' | 'upcoming-releases' | 'system-cleanup' | 'carousel';

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

const AdminDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveAdminSection>('overview');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      
      // Get user profile and check admin permissions
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        toast({
          title: "Erro",
          description: "Erro ao carregar perfil do usuário",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      // If user is not admin, make them admin (first user becomes admin)
      if (profileData.role !== 'admin') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('user_id', session.user.id);

        if (updateError) {
          console.error('Error updating user to admin:', updateError);
        } else {
          profileData.role = 'admin';
          toast({
            title: "Bem-vindo!",
            description: "Você foi configurado como administrador principal do sistema",
          });
        }
      }

      if (profileData.role !== 'admin' && profileData.role !== 'moderator') {
        toast({
          title: "Acesso Negado",
          description: "Você não tem permissão para acessar o painel administrativo",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setProfile(profileData as Profile);
    } catch (error) {
      console.error('Authentication error:', error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const handleSectionChange = (tab: string) => {
    setActiveSection(tab as ActiveAdminSection);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'overview':
        return <AdminDashboardContent />;
      case 'users':
        return <AdvancedUserManagement />;
      case 'content':
        return <AdminContentManagement />;
      case 'support':
        return <AdminSupportManagement />;
      case 'notifications':
        return <AdminNotificationManagement />;
      case 'tools':
        return <AdminToolsManagement />;
      case 'financial':
        return <AdminFinancialManagement />;
      case 'rules':
        return <AdminRulesEditor />;
      case 'team':
        return <AdminTeamManagement />;
      case 'referral-settings':
        return <AdminReferralSettings />;
      case 'upcoming-releases':
        return <AdminUpcomingReleases />;
      case 'system-cleanup':
        return <AdminSystemCleanup />;
      case 'carousel':
        return <AdminCarouselManagement />;
      default:
        return <AdminDashboardContent />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar 
        activeTab={activeSection} 
        setActiveTab={handleSectionChange}
      />
      <main className="flex-1 overflow-auto">
        {renderActiveSection()}
      </main>
    </div>
  );
};

export default AdminDashboard;
