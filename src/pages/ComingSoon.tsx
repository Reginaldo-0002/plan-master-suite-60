
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Crown, Gem, Star, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { useNavigate } from "react-router-dom";
import { Profile } from "@/types/profile";

interface UpcomingRelease {
  id: string;
  title: string;
  description: string | null;
  content_preview: string | null;
  announcement_image: string | null;
  release_date: string;
  target_plans: string[];
  countdown_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UpcomingContent {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  required_plan: 'free' | 'vip' | 'pro';
  hero_image_url: string | null;
  release_date: string | null;
  created_at: string;
  updated_at: string;
}

const ComingSoon = () => {
  const [upcomingReleases, setUpcomingReleases] = useState<UpcomingRelease[]>([]);
  const [upcomingContent, setUpcomingContent] = useState<UpcomingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    fetchUpcomingData();
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
    }
  };

  const fetchUpcomingData = async () => {
    try {
      console.log('Fetching upcoming data...');
      
      // Fetch from upcoming_releases table
      const { data: releasesData, error: releasesError } = await supabase
        .from('upcoming_releases')
        .select('*')
        .eq('is_active', true)
        .gte('release_date', new Date().toISOString())
        .order('release_date', { ascending: true });

      if (releasesError) {
        console.error('Error fetching upcoming releases:', releasesError);
      } else {
        console.log('Upcoming releases result:', releasesData);
        setUpcomingReleases(releasesData || []);
      }

      // Fetch from content table with future scheduled dates
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('id, title, description, content_type, required_plan, hero_image_url, scheduled_publish_at, created_at, updated_at')
        .eq('is_active', true)
        .gte('scheduled_publish_at', todayString)
        .order('scheduled_publish_at', { ascending: true });

      if (contentError) {
        console.error('Error fetching upcoming content:', contentError);
      } else {
        console.log('Upcoming content result:', contentData);
        // Map content data to expected format
        const mappedContentData: UpcomingContent[] = (contentData || []).map(item => ({
          ...item,
          release_date: item.scheduled_publish_at
        }));
        setUpcomingContent(mappedContentData);
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar próximos lançamentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'pro': return <Crown className="w-4 h-4" />;
      case 'vip': return <Gem className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro': return 'bg-plan-pro text-white';
      case 'vip': return 'bg-plan-vip text-white';
      default: return 'bg-plan-free text-white';
    }
  };

  const getTimeUntilRelease = (releaseDate: string) => {
    const now = new Date();
    const release = new Date(releaseDate);
    const diffTime = release.getTime() - now.getTime();
    
    if (diffTime <= 0) return "Disponível agora";
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "1 dia";
    if (diffDays < 30) return `${diffDays} dias`;
    
    const diffMonths = Math.ceil(diffDays / 30);
    if (diffMonths === 1) return "1 mês";
    
    return `${diffMonths} meses`;
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasUpcomingData = upcomingReleases.length > 0 || upcomingContent.length > 0;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar 
        profile={profile} 
        activeSection="coming-soon" 
        onSectionChange={() => {}}
      />
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6" />
          <h1 className="text-3xl font-bold text-foreground">Em Breve</h1>
        </div>
        
        <p className="text-muted-foreground">
          Confira os próximos lançamentos e novidades que estão chegando na plataforma.
        </p>

      {!hasUpcomingData ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum lançamento programado</h3>
            <p className="text-muted-foreground">
              Não há novos conteúdos programados para lançamento no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Releases */}
          {upcomingReleases.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Novos Lançamentos</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcomingReleases.map((release) => (
                  <Card key={release.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {release.announcement_image && (
                      <div className="h-48 bg-cover bg-center" 
                           style={{ backgroundImage: `url(${release.announcement_image})` }} />
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg">{release.title}</CardTitle>
                      {release.description && (
                        <CardDescription>{release.description}</CardDescription>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        Lança em: {getTimeUntilRelease(release.release_date)}
                      </div>
                      {release.target_plans && release.target_plans.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {release.target_plans.map((plan) => (
                            <Badge key={plan} className={getPlanColor(plan)}>
                              {getPlanIcon(plan)}
                              <span className="ml-1 uppercase">{plan}</span>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      {release.content_preview && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {release.content_preview}
                        </p>
                      )}
                      <Button variant="outline" className="w-full" disabled>
                        <Calendar className="w-4 h-4 mr-2" />
                        Disponível em {new Date(release.release_date).toLocaleDateString('pt-BR')}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Content */}
          {upcomingContent.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Novos Conteúdos</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcomingContent.map((item) => (
                  <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {item.hero_image_url && (
                      <div className="h-48 bg-cover bg-center" 
                           style={{ backgroundImage: `url(${item.hero_image_url})` }} />
                    )}
                    <CardHeader>
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <Badge className={getPlanColor(item.required_plan)}>
                          {getPlanIcon(item.required_plan)}
                          <span className="ml-1 uppercase">{item.required_plan}</span>
                        </Badge>
                      </div>
                      {item.description && (
                        <CardDescription>{item.description}</CardDescription>
                      )}
                      {item.release_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          Lança em: {getTimeUntilRelease(item.release_date)}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full" disabled>
                        <Calendar className="w-4 h-4 mr-2" />
                        {item.release_date ? `Disponível em ${new Date(item.release_date).toLocaleDateString('pt-BR')}` : 'Em breve'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default ComingSoon;
