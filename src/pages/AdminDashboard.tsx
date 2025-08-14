import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminDashboardContent } from "@/components/admin/AdminDashboardContent";
import { AdminUserManagement } from "@/components/admin/AdminUserManagement";
import { AdminContentManagement } from "@/components/admin/AdminContentManagement";
import { AdminSupportManagement } from "@/components/admin/AdminSupportManagement";
import { AdminNotificationManagement } from "@/components/admin/AdminNotificationManagement";
import { AdminToolsManagement } from "@/components/admin/AdminToolsManagement";
import { AdminAutoStatusControl } from "@/components/admin/AdminAutoStatusControl";
import { AdminFinancialManagement } from "@/components/admin/AdminFinancialManagement";
import { AdminRulesEditor } from "@/components/admin/AdminRulesEditor";
import { AdminTeamManagement } from "@/components/admin/AdminTeamManagement";
import { AdminReferralSettings } from "@/components/admin/AdminReferralSettings";
import { AdminUpcomingReleases } from "@/components/admin/AdminUpcomingReleases";
import { AdminCarouselManagement } from "@/components/admin/AdminCarouselManagement";
import { AdminSecurityManagement } from "@/components/admin/AdminSecurityManagement";
import { ContentTopicsEditor } from "@/components/content/ContentTopicsEditor";
import { ArrowLeft } from "lucide-react";
import { AdvancedUserManagement } from "@/components/admin/AdvancedUserManagement";
import { AdvancedChatbotManager } from "@/components/admin/AdvancedChatbotManager";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RequireRole } from "@/components/auth/RequireRole";
import { IntegrationsSettings } from "@/components/integrations/IntegrationsSettings";
import { AdminContentVisibility } from "@/components/admin/AdminContentVisibility";

type ActiveAdminSection = 
  | 'overview' 
  | 'users' 
  | 'content' 
  | 'content-topics'
  | 'content-visibility'
  | 'support' 
  | 'notifications' 
  | 'tools' 
  | 'financial' 
  | 'rules' 
  | 'team' 
  | 'referral-settings' 
  | 'upcoming-releases' 
  | 'carousel'
  | 'integrations'
  | 'security';

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState<ActiveAdminSection>('overview');
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  console.log('AdminDashboard - Rendering, activeSection:', activeSection);

  // Handle hash-based navigation and notification redirects
  useEffect(() => {
    const processHash = () => {
      const hash = window.location.hash.replace('#', '');
      console.log('🔍 Processing hash:', hash);
      
      if (hash && hash !== activeSection) {
        const validSections: ActiveAdminSection[] = [
          'overview', 'users', 'content', 'content-topics', 'content-visibility', 'support', 'notifications', 'tools', 
          'financial', 'rules', 'team', 'referral-settings', 'upcoming-releases', 'carousel', 'integrations', 'security'
        ];
        
        if (validSections.includes(hash as ActiveAdminSection)) {
          console.log('✅ Valid hash section, changing to:', hash);
          setActiveSection(hash as ActiveAdminSection);
          
          // Special handling for support section with notification
          if (hash === 'support') {
            const notificationData = sessionStorage.getItem('adminChatNotification');
            if (notificationData) {
              console.log('🎯 Support section with notification data, dispatching event...');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('openAdminChat', {
                  detail: JSON.parse(notificationData)
                }));
              }, 500);
            }
          }
        }
      }
    };

    // Process initial hash
    processHash();

    // Listen for hash changes
    const handleHashChange = () => {
      console.log('🔗 Hash change detected');
      processHash();
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [activeSection]);

  const handleSectionChange = (tab: string) => {
    console.log('AdminDashboard - Section change:', tab);
    const validSections: ActiveAdminSection[] = [
      'overview', 'users', 'content', 'content-topics', 'content-visibility', 'support', 'notifications', 'tools', 
      'financial', 'rules', 'team', 'referral-settings', 'upcoming-releases', 'carousel', 'integrations', 'security'
    ];
    
    if (validSections.includes(tab as ActiveAdminSection)) {
      setActiveSection(tab as ActiveAdminSection);
      
      // Update URL hash to keep navigation in sync
      if (window.location.hash !== `#${tab}`) {
        window.history.pushState(null, '', `/admin#${tab}`);
      }
      
      if (tab !== 'content-topics') {
        setSelectedContentId(null);
      }
      
      // Clear any notification data when navigating away from support
      if (tab !== 'support') {
        sessionStorage.removeItem('adminChatNotification');
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
      case 'content-visibility':
        return <AdminContentVisibility />;
      case 'support':
        return <AdminSupportManagement />;
      case 'notifications':
        return <AdminNotificationManagement />;
      case 'tools':
        return (
          <div className="space-y-6">
            <AdminToolsManagement />
            <AdminAutoStatusControl />
          </div>
        );
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
        case 'integrations':
          return <IntegrationsSettings onSectionChange={handleSectionChange} />;
        case 'security':
          return <AdminSecurityManagement />;
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