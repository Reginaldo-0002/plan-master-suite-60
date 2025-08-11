
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js';
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { ContentSection } from "@/components/dashboard/ContentSection";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { SupportChat } from "@/components/support/SupportChat";
import { ContentCarouselPage } from "./ContentCarouselPage";
import { Loader2 } from "lucide-react";

type ActiveSection = 'dashboard' | 'products' | 'tools' | 'courses' | 'tutorials' | 'carousel' | 'settings';

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
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        } else {
          // Defer profile fetch with setTimeout
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      } else {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !session) {
    return null;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardContent profile={profile} />;
      case 'products':
        return <ContentSection contentType="product" userPlan={profile?.plan || 'free'} />;
      case 'tools':
        return <ContentSection contentType="tool" userPlan={profile?.plan || 'free'} />;
      case 'courses':
        return <ContentSection contentType="course" userPlan={profile?.plan || 'free'} />;
      case 'tutorials':
        return <ContentSection contentType="tutorial" userPlan={profile?.plan || 'free'} />;
      case 'carousel':
        return <ContentCarouselPage userPlan={profile?.plan || 'free'} />;
      case 'settings':
        return <ProfileSettings profile={profile} onProfileUpdate={setProfile} />;
      default:
        return <DashboardContent profile={profile} />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        profile={profile} 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
      />
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>
      <SupportChat />
    </div>
  );
};

export default Dashboard;
