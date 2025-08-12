import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfileData } from "@/hooks/useProfileData";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { ContentSection } from "@/components/dashboard/ContentSection";
import { RulesSection } from "@/components/dashboard/RulesSection";
import { ComingSoonSection } from "@/components/dashboard/ComingSoonSection";
import { CarouselSection } from "@/components/dashboard/CarouselSection";
import { TopicsRouter } from "@/components/navigation/TopicsRouter";
import { SupportChat } from "@/components/support/SupportChat";
import { Loader2 } from "lucide-react";
import { Profile } from "@/types/profile";

type ActiveSection = "dashboard" | "products" | "tools" | "courses" | "tutorials" | "rules" | "coming-soon" | "carousel" | "profile" | "settings" | "topics";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<ActiveSection>("dashboard");
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  // Use the new profile hook for real-time data
  const { profile, loading: profileLoading, updateProfile } = useProfileData(user?.id);
  const loading = profileLoading;

  // Check authentication
  useEffect(() => {
    console.log('Dashboard useEffect - Auth state:', { user: !!user, isAuthenticated });
    
    if (!isAuthenticated && !loading) {
      console.log('Not authenticated, redirecting to auth');
      navigate('/auth');
      return;
    }
  }, [user, isAuthenticated, navigate, loading]);

  // Get initial section from URL and handle content parameter
  useEffect(() => {
    const handleInitialRoute = () => {
      const path = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);
      const sectionParam = urlParams.get('section');
      const contentParam = urlParams.get('content');
      
      console.log('Initial route check - section:', sectionParam, 'content:', contentParam, 'path:', path);
      
      if (contentParam) {
        console.log('Dashboard detected content param:', contentParam);
        setSelectedContentId(contentParam);
        setActiveSection('topics');
      } else if (sectionParam) {
        setActiveSection(sectionParam as ActiveSection);
        setSelectedContentId(null);
      } else {
        switch (path) {
          case '/rules':
            setActiveSection('rules');
            break;
          case '/em-breve':
            setActiveSection('coming-soon');
            break;
          case '/carousel':
            setActiveSection('carousel');
            break;
          case '/produtos':
            setActiveSection('products');
            break;
          case '/cursos':
            setActiveSection('courses');
            break;
          case '/ferramentas':
            setActiveSection('tools');
            break;
          case '/tutoriais':
            setActiveSection('tutorials');
            break;
          default:
            setActiveSection('dashboard');
        }
      }
    };

    handleInitialRoute();

    // Listen for URL changes
    const handlePopState = () => {
      handleInitialRoute();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Profile management is now handled by useProfileData hook

  const handleNavigation = (section: ActiveSection) => {
    console.log('Navigating to section:', section);
    setActiveSection(section);
    setSelectedContentId(null);
    
    // Update URL without triggering a full page reload
    const newUrl = section === 'dashboard' ? '/dashboard' : `/dashboard?section=${section}`;
    window.history.pushState({}, '', newUrl);
  };

  const handleContentSelection = (contentId: string) => {
    console.log('Content selected:', contentId);
    setSelectedContentId(contentId);
    setActiveSection('topics');
    
    // Update URL to include content parameter
    const newUrl = `/dashboard?section=topics&content=${contentId}`;
    window.history.pushState({}, '', newUrl);
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    // The profile will be updated automatically via real-time subscription
    console.log('Profile updated via dashboard:', updatedProfile);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-lg">Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
          <p className="text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  const renderActiveSection = () => {
    if (activeSection === 'topics' && selectedContentId) {
      return (
        <TopicsRouter 
          contentId={selectedContentId} 
          userPlan={profile.plan}
          onBack={() => {
            setActiveSection('dashboard');
            setSelectedContentId(null);
            window.history.pushState({}, '', '/dashboard');
          }}
        />
      );
    }

    switch (activeSection) {
      case 'dashboard':
        return <DashboardContent onContentSelect={handleContentSelection} />;
      case 'products':
        return (
          <ContentSection 
            contentType="products" 
            title="Produtos" 
            description="Acesse nossos produtos exclusivos"
            userPlan={profile.plan}
            onContentSelect={handleContentSelection}
          />
        );
      case 'tools':
        return (
          <ContentSection 
            contentType="tools" 
            title="Ferramentas" 
            description="Ferramentas poderosas para acelerar seus resultados"
            userPlan={profile.plan}
            onContentSelect={handleContentSelection}
          />
        );
      case 'courses':
        return (
          <ContentSection 
            contentType="courses" 
            title="Cursos" 
            description="Aprenda com nossos cursos exclusivos"
            userPlan={profile.plan}
            onContentSelect={handleContentSelection}
          />
        );
      case 'tutorials':
        return (
          <ContentSection 
            contentType="tutorials" 
            title="Tutoriais" 
            description="Tutoriais passo a passo para dominar as técnicas"
            userPlan={profile.plan}
            onContentSelect={handleContentSelection}
          />
        );
      case 'rules':
        return <RulesSection />;
      case 'coming-soon':
        return <ComingSoonSection userPlan={profile.plan} />;
      case 'carousel':
        return <CarouselSection userPlan={profile.plan} />;
      case 'profile':
      case 'settings':
        return <ProfileSettings profile={profile} onProfileUpdate={handleProfileUpdate} />;
      default:
        return <DashboardContent onContentSelect={handleContentSelection} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar 
        activeSection={activeSection} 
        onNavigate={handleNavigation}
        userPlan={profile.plan}
        userRole={profile.role}
      />
      <main className="flex-1 overflow-auto">
        {renderActiveSection()}
      </main>
      <SupportChat profile={profile} />
    </div>
  );
}