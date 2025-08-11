
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { ContentSection } from "@/components/dashboard/ContentSection";
import { SupportChat } from "@/components/support/SupportChat";
import { Loader2 } from "lucide-react";
import { Profile } from "@/types/profile";

type ActiveSection = "dashboard" | "products" | "tools" | "courses" | "rules" | "coming-soon" | "profile" | "settings";

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveSection>("dashboard");
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        window.location.href = '/auth';
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              {
                user_id: user.id,
                plan: 'free',
                role: 'user',
                full_name: null,
                avatar_url: null,
                pix_key: null,
                total_session_time: 0,
                areas_accessed: 0,
                referral_earnings: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ])
            .select()
            .single();

          if (createError) throw createError;
          setProfile(newProfile);
        } else {
          throw error;
        }
      } else {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar perfil do usuário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
  };

  const handleSectionChange = (section: ActiveSection) => {
    setActiveSection(section);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Erro ao carregar perfil</h2>
          <p className="text-muted-foreground">Tente recarregar a página</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardContent profile={profile} />;
      case "products":
        return <ContentSection type="products" userPlan={profile.plan} />;
      case "tools":
        return <ContentSection type="tools" userPlan={profile.plan} />;
      case "courses":
        return <ContentSection type="courses" userPlan={profile.plan} />;
      case "rules":
        return <ContentSection type="rules" userPlan={profile.plan} />;
      case "coming-soon":
        return <ContentSection type="coming-soon" userPlan={profile.plan} />;
      case "profile":
        return (
          <ProfileSettings 
            profile={profile} 
            onProfileUpdate={handleProfileUpdate} 
          />
        );
      case "settings":
        return (
          <ProfileSettings 
            profile={profile} 
            onProfileUpdate={handleProfileUpdate} 
          />
        );
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
      
      <main className="flex-1 overflow-y-auto p-6">
        {renderContent()}
      </main>

      <SupportChat profile={profile} />
    </div>
  );
}
