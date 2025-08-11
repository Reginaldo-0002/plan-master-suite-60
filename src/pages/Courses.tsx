import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ContentSection } from "@/components/dashboard/ContentSection";
import { Sidebar } from "@/components/layout/Sidebar";
import { SupportChat } from "@/components/support/SupportChat";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/profile";
import { Loader2 } from "lucide-react";

const Courses = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([
            {
              user_id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
              plan: 'free' as const
            }
          ])
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          return;
        }

        setProfile(newProfile);
      } else if (error) {
        console.error('Error fetching profile:', error);
        return;
      } else {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando cursos...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Erro ao carregar perfil do usuário.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        profile={profile}
        activeSection="courses"
        onSectionChange={(section) => {
          if (section === 'dashboard') navigate('/dashboard');
          else if (section === 'products') navigate('/produtos');
          else if (section === 'courses') navigate('/cursos');
          else if (section === 'tools') navigate('/ferramentas');
          else if (section === 'tutorials') navigate('/tutoriais');
          else if (section === 'rules') navigate('/rules');
          else if (section === 'carousel') navigate('/carousel');
          else if (section === 'coming-soon') navigate('/em-breve');
        }}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <ContentSection type="courses" userPlan={profile.plan} />
        </main>
      </div>
      
      <SupportChat profile={profile} />
    </div>
  );
};

export default Courses;