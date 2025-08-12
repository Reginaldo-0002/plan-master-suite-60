
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';
import { useAuth } from "@/hooks/useAuth";
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
import { RequireRole } from "@/components/auth/RequireRole";

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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveAdminSection>('overview');
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handleAsyncError } = useErrorHandler();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log('AdminDashboard - Simplified auth check started');
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
    <RequireRole role="moderator">
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
    </RequireRole>
  );
};

export default AdminDashboard;
