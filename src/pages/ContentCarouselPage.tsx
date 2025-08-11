
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ContentCarousel } from "@/components/carousel/ContentCarousel";
import { TopicsGallery } from "@/components/topics/TopicsGallery";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/profile";
import { Loader2 } from "lucide-react";

interface ContentCarouselPageProps {
  userPlan?: 'free' | 'vip' | 'pro';
}

export const ContentCarouselPage = ({ userPlan: propUserPlan }: ContentCarouselPageProps) => {
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!propUserPlan) {
      fetchProfile();
    } else {
      setLoading(false);
    }

    // Check for content parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const contentId = urlParams.get('content');
    if (contentId) {
      setSelectedContentId(contentId);
    }
  }, [propUserPlan]);

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

  const userPlan = propUserPlan || profile?.plan || 'free';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const handleContentClick = (contentId: string) => {
    setSelectedContentId(contentId);
  };

  const handleBack = () => {
    setSelectedContentId(null);
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'vip': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (selectedContentId) {
    return (
      <TopicsGallery 
        contentId={selectedContentId} 
        userPlan={userPlan} 
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="flex-1 space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Conteúdos em Destaque
          </h2>
          <p className="text-muted-foreground">
            Explore nossos produtos, ferramentas, cursos e tutoriais
          </p>
        </div>
        <Badge className={getPlanBadgeColor(userPlan)}>
          Plano {userPlan.toUpperCase()}
        </Badge>
      </div>

      {/* Carousel */}
      <ContentCarousel 
        userPlan={userPlan} 
        onContentClick={handleContentClick}
      />
    </div>
  );
};
