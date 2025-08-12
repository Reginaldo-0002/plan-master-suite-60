import { useState } from "react";
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
import { ArrowLeft } from "lucide-react";
import { AdvancedUserManagement } from "@/components/admin/AdvancedUserManagement";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { RequireRole } from "@/components/auth/RequireRole";
import { ChatRestrictionTest } from "@/components/test/ChatRestrictionTest";

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

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState<ActiveAdminSection>('overview');
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  console.log('AdminDashboard - Rendering, activeSection:', activeSection);

  const handleSectionChange = (tab: string) => {
    console.log('AdminDashboard - Section change:', tab);
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

  const renderActiveSection = () => {
    console.log('AdminDashboard - Rendering section:', activeSection);
    
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
            
            {/* Componente de teste temporário */}
            <div className="fixed top-4 left-4 z-50">
              <ChatRestrictionTest />
            </div>
          </main>
        </div>
      </ErrorBoundary>
    </RequireRole>
  );
};

export default AdminDashboard;