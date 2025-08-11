
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { ContentSection } from "@/components/dashboard/ContentSection";
import { SupportChat } from "@/components/support/SupportChat";
import { Loader2 } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  pix_key?: string;
  plan: 'free' | 'vip' | 'pro';
  role: string;
  referral_code: string;
  referral_earnings: number;
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");
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
          // Profile doesn't exist, create one
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              {
                user_id: user.id,
                plan: 'free',
                role: 'user'
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
        return <ContentSection contentType="product" userPlan={profile.plan} />;
      case "tools":
        return <ContentSection contentType="tool" userPlan={profile.plan} />;
      case "courses":
        return <ContentSection contentType="course" userPlan={profile.plan} />;
      case "tutorials":
        return <ContentSection contentType="tutorial" userPlan={profile.plan} />;
      case "profile":
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
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
        userPlan={profile.plan}
        userRole={profile.role}
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        {renderContent()}
      </main>

      {/* Support Chat */}
      <SupportChat userId={profile.user_id} />
    </div>
  );
}
