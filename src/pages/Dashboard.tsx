
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { ContentSection } from "@/components/dashboard/ContentSection";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { TopicsGallery } from "@/components/topics/TopicsGallery";
import { ContentCarousel } from "@/components/carousel/ContentCarousel";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { validateProfileData } from "@/lib/typeGuards";

type ActiveSection = 'dashboard' | 'products' | 'tools' | 'courses' | 'tutorials' | 'rules' | 'coming-soon' | 'carousel' | 'settings';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'vip' | 'pro';
  pix_key: string | null;
  total_session_time: number;
  areas_accessed: number;
  referral_code: string;
  referral_earnings: number;
  loyalty_level: string;
  total_points: number;
  last_activity: string | null;
  preferences: any;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
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
        navigate("/auth");
        return null;
      }

      if (!validateProfileData(profileData)) {
        console.error('Invalid profile data:', profileData);
        toast({
          title: "Erro",
          description: "Dados do perfil inválidos",
          variant: "destructive",
        });
        navigate("/auth");
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

  const handleSectionChange = (section: ActiveSection) => {
    setActiveSection(section);
    setSelectedContentId(null); // Reset content selection when changing sections
  };

  const handleContentClick = (contentId: string) => {
    setSelectedContentId(contentId);
    setActiveSection('tutorials'); // Navigate to tutorials when content is clicked
  };

  const handleBackFromTutorials = () => {
    setSelectedContentId(null);
    setActiveSection('carousel'); // Go back to carousel when backing out of tutorials
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
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
      case 'dashboard':
        return <DashboardContent profile={profile} />;
      case 'products':
        return <ContentSection type="products" userPlan={profile.plan} />;
      case 'tools':
        return <ContentSection type="tools" userPlan={profile.plan} />;
      case 'courses':
        return <ContentSection type="courses" userPlan={profile.plan} />;
      case 'tutorials':
        if (selectedContentId) {
          return (
            <TopicsGallery 
              contentId={selectedContentId} 
              userPlan={profile.plan} 
              onBack={handleBackFromTutorials}
            />
          );
        }
        return <ContentSection type="tutorials" userPlan={profile.plan} />;
      case 'rules':
        return <ContentSection type="rules" userPlan={profile.plan} />;
      case 'coming-soon':
        return <ContentSection type="coming-soon" userPlan={profile.plan} />;
      case 'carousel':
        return (
          <ContentCarousel 
            userPlan={profile.plan} 
            onContentClick={handleContentClick}
          />
        );
      case 'settings':
        return <ProfileSettings profile={profile} onProfileUpdate={handleProfileUpdate} />;
      default:
        return <DashboardContent profile={profile} />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        profile={profile} 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange}
      />
      <main className="flex-1 overflow-auto">
        {renderActiveSection()}
      </main>
    </div>
  );
};

export default Dashboard;
