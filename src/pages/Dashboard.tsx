import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { ContentSection } from "@/components/dashboard/ContentSection";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { SupportChat } from "@/components/support/SupportChat";
import { ContentCarouselPage } from "./ContentCarouselPage";
import { Loader2 } from "lucide-react";
import { IntelligentSupportChat } from "@/components/support/IntelligentSupportChat";

type DashboardSection = 'dashboard' | 'products' | 'tools' | 'courses' | 'tutorials' | 'carousel' | 'settings';

interface User {
  id: string;
  email?: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  plan: 'free' | 'vip' | 'pro';
  role: string;
  referral_code: string;
  referral_earnings: number;
  pix_key: string | null;
  avatar_url: string | null;
  total_session_time: number;
  areas_accessed: number;
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
  const [activeSection, setActiveSection] = useState<DashboardSection>('dashboard');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        navigate('/auth');
        return;
      }

      setUser(user);

      // Fetch user profile with all new fields
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        toast({
          title: "Erro",
          description: "Erro ao carregar perfil do usuário",
          variant: "destructive",
        });
      } else {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionChange = (section: DashboardSection) => {
    setActiveSection(section);
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
        return <ContentSection contentType="product" userPlan={profile.plan} />;
      case 'tools':
        return <ContentSection contentType="tool" userPlan={profile.plan} />;
      case 'courses':
        return <ContentSection contentType="course" userPlan={profile.plan} />;
      case 'tutorials':
        return <ContentSection contentType="tutorial" userPlan={profile.plan} />;
      case 'carousel':
        return <ContentCarouselPage userPlan={profile.plan} />;
      case 'settings':
        return <ProfileSettings profile={profile} onProfileUpdate={handleProfileUpdate} />;
      default:
        return <DashboardContent profile={profile} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background relative">
      <Sidebar
        profile={profile}
        activeSection={activeSection === 'carousel' ? 'dashboard' : activeSection}
        onSectionChange={handleSectionChange}
      />
      <div className="flex-1 flex flex-col relative z-10">
        <main className="flex-1 overflow-auto">
          {renderActiveSection()}
        </main>
      </div>
      <IntelligentSupportChat userId={user.id} userPlan={profile.plan} />
    </div>
  );
};

export default Dashboard;
