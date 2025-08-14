import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import { useProfileRealtime } from "@/hooks/useProfileRealtime";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { ContentSection } from "@/components/dashboard/ContentSection";
import { RulesSection } from "@/components/dashboard/RulesSection";
import { PlansSection } from "@/components/dashboard/PlansSection";
import { ToolsSection } from "@/components/dashboard/ToolsSection";
import { EnhancedChatbot } from "@/components/chatbot/EnhancedChatbot";
import { ComingSoonSection } from "@/components/dashboard/ComingSoonSection";
import { CarouselSection } from "@/components/dashboard/CarouselSection";
import { TopicsRouter } from "@/components/navigation/TopicsRouter";
import { SupportChat } from "@/components/support/SupportChat";
import { useWebhookIntegration } from "@/hooks/useWebhookIntegration";
import { Loader2 } from "lucide-react";
import { Profile } from "@/types/profile";

type ActiveSection = "dashboard" | "products" | "tools" | "courses" | "tutorials" | "plans" | "rules" | "coming-soon" | "carousel" | "profile" | "settings" | "topics";

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveSection>("dashboard");
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { role: userRole, loading: roleLoading } = useRoleCheck();
  const { profile: realtimeProfile } = useProfileRealtime(user?.id);
  
  // Initialize webhook integration for real-time payment updates
  const { isListening: webhookListening } = useWebhookIntegration(user?.email);

  // Usar o perfil em tempo real se disponível, senão usar o perfil local
  const currentProfile = realtimeProfile || profile;

  // Check authentication
  useEffect(() => {
    console.log('Dashboard useEffect - Auth state:', { user: !!user, isAuthenticated });
    
    if (!isAuthenticated && !loading) {
      console.log('Not authenticated, redirecting to auth');
      navigate('/auth');
      return;
    }

    if (user && !profile && !realtimeProfile) {
      fetchProfile();
    }
  }, [user, isAuthenticated, navigate, profile, realtimeProfile]);

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

  const fetchProfile = async () => {
    if (!user) return;

    try {
      console.log('Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating new profile...');
          await createProfile();
          return;
        }
        
        toast({
          title: "Erro",
          description: "Erro ao carregar perfil do usuário",
          variant: "destructive",
        });
        return;
      }

      console.log('Profile loaded:', data);
      setProfile(data);
    } catch (error) {
      console.error('Profile fetch error:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || null,
          plan: 'free',
          role: 'user'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        toast({
          title: "Erro",
          description: "Erro ao criar perfil do usuário",
          variant: "destructive",
        });
        return;
      }

      console.log('Profile created:', data);
      setProfile(data);
    } catch (error) {
      console.error('Profile creation error:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao criar perfil",
        variant: "destructive",
      });
    }
  };

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
    console.log('Dashboard - handleProfileUpdate called with:', updatedProfile);
    setProfile(updatedProfile);
  };

  if (loading || !user || roleLoading) {
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

  if (!currentProfile) {
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
          userPlan={currentProfile.plan}
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
            userPlan={currentProfile.plan}
            onContentSelect={handleContentSelection}
          />
        );
      case 'tools':
        return <ToolsSection userPlan={currentProfile.plan} />;
      case 'courses':
        return (
          <ContentSection 
            contentType="courses" 
            title="Cursos" 
            description="Aprenda com nossos cursos exclusivos"
            userPlan={currentProfile.plan}
            onContentSelect={handleContentSelection}
          />
        );
      case 'tutorials':
        return (
          <ContentSection 
            contentType="tutorials" 
            title="Tutoriais" 
            description="Tutoriais passo a passo para dominar as técnicas"
            userPlan={currentProfile.plan}
            onContentSelect={handleContentSelection}
          />
        );
      case 'plans':
        return <PlansSection userPlan={currentProfile.plan} profile={currentProfile} />;
      case 'rules':
        return <RulesSection />;
      case 'coming-soon':
        return <ComingSoonSection userPlan={currentProfile.plan} />;
      case 'carousel':
        return <CarouselSection userPlan={currentProfile.plan} />;
      case 'profile':
      case 'settings':
        return <ProfileSettings profile={currentProfile} onProfileUpdate={handleProfileUpdate} />;
      default:
        return <DashboardContent onContentSelect={handleContentSelection} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar 
        activeSection={activeSection} 
        onNavigate={handleNavigation}
        userPlan={currentProfile.plan}
        userRole={userRole || 'user'}
      />
      <main className="flex-1 overflow-auto">
        {renderActiveSection()}
      </main>
      
      {/* Support Chat - Only on non-admin sections */}
      {!['topics'].includes(activeSection) && currentProfile && (
        <SupportChat profile={currentProfile} />
      )}
      
      {/* Enhanced Chatbot - Active in all sections */}
      {currentProfile && (
        <EnhancedChatbot 
          userId={currentProfile.user_id}
          className="fixed bottom-20 right-4 z-40"
        />
      )}
    </div>
  );
}