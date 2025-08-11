
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
import { AdminCarouselManagement } from "@/components/admin/AdminCarouselManagement";
import { ContentTopicsEditor } from "@/components/content/ContentTopicsEditor";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdvancedUserManagement } from "@/components/admin/AdvancedUserManagement";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { validateProfileData } from "@/lib/typeGuards";
import { Button } from "@/components/ui/button";

type ActiveAdminSection = 
  | 'overview' 
  | 'users' 
  | 'content' 
  | 'content-topics'
  | 'support' 
  | 'notifications' 
  | 'tools' 
  | 'financial' 
  | 'rules' 
  | 'team' 
  | 'referral-settings' 
  | 'upcoming-releases' 
  | 'carousel';

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
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handleAsyncError } = useErrorHandler();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const result = await handleAsyncError(async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        navigate("/auth");
        return null;
      }

      setUser(session.user);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        navigate("/dashboard");
        return null;
      }

      if (!validateProfileData(profileData)) {
        console.error('Invalid profile data:', profileData);
        toast({
          title: "Erro",
          description: "Dados do perfil inválidos",
          variant: "destructive",
        });
        navigate("/dashboard");
        return null;
      }

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
        return null;
      }

      setProfile(profileData as Profile);
      return profileData;
    }, {
      title: "Erro de Autenticação",
      showToast: false
    });

    if (!result) {
      navigate("/auth");
    }
    
    setLoading(false);
  };

  const handleSectionChange = (tab: string) => {
    const validSections: ActiveAdminSection[] = [
      'overview', 'users', 'content', 'content-topics', 'support', 'notifications', 'tools', 
      'financial', 'rules', 'team', 'referral-settings', 'upcoming-releases', 'carousel'
    ];
    
    if (validSections.includes(tab as ActiveAdminSection)) {
      setActiveSection(tab as ActiveAdminSection);
      if (tab !== 'content-topics') {
        setSelectedContentId(null);
      }
    }
  };

  const handleEditTopics = (contentId: string) => {
    setSelectedContentId(contentId);
    setActiveSection('content-topics');
  };

  const handleBackToContent = () => {
    setSelectedContentId(null);
    setActiveSection('content');
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
        return <AdminContentManagement onEditTopics={handleEditTopics} />;
      case 'content-topics':
        if (selectedContentId) {
          return (
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <Button
                  variant="outline"
                  onClick={handleBackToContent}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar para Gestão de Conteúdo
                </Button>
              </div>
              <ContentTopicsEditor 
                contentId={selectedContentId} 
                onSave={handleBackToContent} 
              />
            </div>
          );
        }
        return <AdminContentManagement onEditTopics={handleEditTopics} />;
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
      case 'carousel':
        return <AdminCarouselManagement />;
      default:
        return <AdminDashboardContent />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-background">
        <AdminSidebar 
          activeTab={activeSection} 
          setActiveTab={handleSectionChange}
        />
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            {renderActiveSection()}
          </ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default AdminDashboard;
