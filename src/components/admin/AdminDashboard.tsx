import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSidebar } from "./AdminSidebar";
import { AdminDashboardContent } from "./AdminDashboardContent";
import { AdminContentManagement } from "./AdminContentManagement";
import { AdminReferralSettings } from "./AdminReferralSettings";
import { AdminUpcomingReleases } from "./AdminUpcomingReleases";
import { AdminSystemCleanup } from "./AdminSystemCleanup";
import { ContentTopicsEditor } from "@/components/content/ContentTopicsEditor";
import { AdminUserManagement } from "./AdminUserManagement";
import { AdminFinancialDashboard } from "./AdminFinancialDashboard";
import { AdminCarouselManagement } from "./AdminCarouselManagement";
import { AdminNotificationCenter } from "./AdminNotificationCenter";
import { AdminToolsManagement } from "./AdminToolsManagement";
import { AdminSupportCenter } from "./AdminSupportCenter";
import { AdminChatHandler } from "./AdminChatHandler";
import { AdminTeamManagement } from "./AdminTeamManagement";
import { AdminAutoStatusManagement } from "./AdminAutoStatusManagement";
import { AdminRulesManagement } from "./AdminRulesManagement";

interface AdminDashboardProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const AdminDashboard = ({ activeTab, setActiveTab }: AdminDashboardProps) => {
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminDashboardContent />;
      case 'users':
        return <AdminUserManagement />;
      case 'financials':
        return <AdminFinancialDashboard />;
      case 'content':
        return selectedContentId ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setSelectedContentId(null)}
                className="text-futuristic-primary hover:underline"
              >
                ← Voltar para Gestão de Conteúdo
              </button>
            </div>
            <ContentTopicsEditor 
              contentId={selectedContentId} 
              onSave={() => {}} 
            />
          </div>
        ) : (
          <AdminContentManagement />
        );
      case 'upcoming-releases':
        return <AdminUpcomingReleases />;
      case 'carousel':
        return <AdminCarouselManagement />;
      case 'notifications':
        return <AdminNotificationCenter />;
      case 'referral-settings':
        return <AdminReferralSettings />;
      case 'tools':
        return <AdminToolsManagement />;
      case 'support':
        return <AdminSupportCenter />;
      case 'chat':
        return <AdminChatHandler />;
      case 'team':
        return <AdminTeamManagement />;
      case 'auto-status':
        return <AdminAutoStatusManagement />;
      case 'rules':
        return <AdminRulesManagement />;
      case 'system-cleanup':
        return <AdminSystemCleanup />;
      default:
        return <AdminDashboardContent />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-6">
        {renderContent()}
      </main>
    </div>
  );
};
