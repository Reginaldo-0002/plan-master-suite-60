
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Crown, Gem, Star, Lock, Calendar, FileText, Play, Download, ExternalLink, X, KeyRound, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAreaTracking } from "@/hooks/useAreaTracking";
import { useOptimizedNavigation } from "@/hooks/useOptimizedNavigation";

interface Content {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  status: 'active' | 'maintenance' | 'blocked' | 'published' | 'draft';
  required_plan: 'free' | 'vip' | 'pro' | 'premium';
  hero_image_url: string | null;
  video_url: string | null;
  release_date: string | null;
  created_at: string;
  updated_at: string;
  password_protected?: boolean;
  content_password?: string;
  scheduled_lock?: boolean;
  lock_start_date?: string;
  lock_end_date?: string;
}

interface ContentSectionProps {
  contentType: string;
  title: string;
  description: string;
  userPlan: 'free' | 'vip' | 'pro' | 'premium';
  onContentSelect?: (contentId: string) => void;
}

interface VideoPlayer {
  id: string;
  title: string;
  description: string | null;
}

export const ContentSection = ({ contentType, title, description, userPlan, onContentSelect }: ContentSectionProps) => {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoPlayer | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const { toast } = useToast();
  const { trackAreaAccess } = useAreaTracking();
  const { navigateToPlans } = useOptimizedNavigation();

  const planHierarchy = { 'free': 0, 'vip': 1, 'pro': 2 };

  useEffect(() => {
    fetchContent();
    trackAreaAccess(`Content-${contentType}`);
  }, [contentType, trackAreaAccess]);

  const getContentTypeForQuery = (type: string): 'product' | 'tool' | 'course' | 'tutorial' | null => {
    switch (type) {
      case 'products': return 'product';
      case 'tools': return 'tool';
      case 'courses': return 'course';
      case 'tutorials': return 'tutorial';
      case 'rules': return null; // Rules handled by RulesSection
      case 'carousel': return null; // Carousel shows all types
      case 'coming-soon': return null; // Coming soon handled separately
      default: return null;
    }
  };

  const fetchContent = async () => {
    try {
      console.log('🔄 Fetching content for type:', contentType, 'userPlan:', userPlan);
      
      // Verificar usuário atual para debug
      const currentUser = await supabase.auth.getUser();
      console.log('👤 Current user ID:', currentUser.data.user?.id);
      
      // Verificar regras de visibilidade primeiro para debug
      if (currentUser.data.user?.id) {
        const { data: visibilityRules } = await supabase
          .from('content_visibility_rules')
          .select('content_id, is_visible')
          .eq('user_id', currentUser.data.user.id);
        
        console.log('👀 Visibility rules for user:', visibilityRules);
      }

      let query = supabase
        .from('content')
        .select('id, title, description, content_type, status, required_plan, hero_image_url, video_url, scheduled_publish_at, created_at, updated_at, password_protected, content_password, scheduled_lock, lock_start_date, lock_end_date')
        .eq('is_active', true)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      const contentTypeQuery = getContentTypeForQuery(contentType);
      
      if (contentTypeQuery) {
        query = query.eq('content_type', contentTypeQuery);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching content:', error);
        throw error;
      }

      console.log('✅ Content fetched successfully (before RLS filtering):', { 
        count: data?.length || 0, 
        type: contentType,
        items: data?.map(item => ({ id: item.id, title: item.title, required_plan: item.required_plan }))
      });

      // A política RLS deveria ter filtrado automaticamente, mas vamos verificar manualmente também
      // para garantir que conteúdo oculto não apareça
      let filteredData = data || [];
      
      if (currentUser.data.user?.id) {
        const { data: hiddenContent } = await supabase
          .from('content_visibility_rules')
          .select('content_id')
          .eq('user_id', currentUser.data.user.id)
          .eq('is_visible', false);
          
        const hiddenContentIds = hiddenContent?.map(rule => rule.content_id) || [];
        console.log('🚫 Hidden content IDs for user:', hiddenContentIds);
        
        // Filtrar manualmente conteúdo oculto
        filteredData = filteredData.filter(item => !hiddenContentIds.includes(item.id));
        
        console.log('✅ Content after manual filtering:', { 
          count: filteredData.length, 
          items: filteredData.map(item => ({ id: item.id, title: item.title }))
        });
      }

      const mappedData: Content[] = filteredData.map(item => ({
        ...item,
        status: (item.status as 'active' | 'maintenance' | 'blocked' | 'published' | 'draft') || 'published',
        release_date: item.scheduled_publish_at
      }));

      setContent(mappedData);
    } catch (error) {
      console.error('💥 Error in fetchContent:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar conteúdo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isContentLocked = (contentItem: Content): { locked: boolean; reason: string } => {
    // Verificar bloqueio por agendamento
    if (contentItem.scheduled_lock && contentItem.lock_start_date && contentItem.lock_end_date) {
      const now = new Date();
      const startDate = new Date(contentItem.lock_start_date);
      const endDate = new Date(contentItem.lock_end_date);
      
      if (now >= startDate && now <= endDate) {
        return { 
          locked: true, 
          reason: `Conteúdo bloqueado até ${endDate.toLocaleDateString('pt-BR')} às ${endDate.toLocaleTimeString('pt-BR')}`
        };
      }
    }
    
    return { locked: false, reason: '' };
  };

  const handleAccessContent = async (contentItem: Content) => {
    if (!canAccess(contentItem.required_plan) || (contentItem.status !== 'active' && contentItem.status !== 'published')) {
      return;
    }

    // Verificar bloqueio por agendamento
    const lockStatus = isContentLocked(contentItem);
    if (lockStatus.locked) {
      toast({
        title: "Conteúdo Bloqueado",
        description: lockStatus.reason,
        variant: "destructive",
      });
      return;
    }

    // Verificar se conteúdo é protegido por senha
    if (contentItem.password_protected && contentItem.content_password) {
      setSelectedContent(contentItem);
      setPasswordDialogOpen(true);
      return;
    }

    // Prosseguir com o acesso normal
    await proceedToContent(contentItem);
  };

  const handlePasswordSubmit = async () => {
    if (!selectedContent) return;

    if (passwordInput === selectedContent.content_password) {
      setPasswordDialogOpen(false);
      setPasswordInput("");
      await proceedToContent(selectedContent);
      setSelectedContent(null);
    } else {
      toast({
        title: "Senha Incorreta",
        description: "A senha digitada está incorreta. Tente novamente.",
        variant: "destructive",
      });
    }
  };


  const proceedToContent = async (contentItem: Content) => {
    try {
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      
      // Track area access when accessing content
      trackAreaAccess(`Content-${contentItem.id}`);
      
      // Log user interaction
      await supabase
        .from('user_interactions')
        .insert([{
          user_id: currentUserId,
          interaction_type: 'content_access',
          target_type: 'content',
          target_id: contentItem.id,
          metadata: { content_type: contentItem.content_type }
        }]);

      // Always navigate to topics first - user chooses video/materials inside topics
      // Navigate to topics - use callback if available, otherwise use programmatic navigation
      console.log('Navigating to topics with content ID:', contentItem.id);
      if (onContentSelect) {
        onContentSelect(contentItem.id);
      } else {
        const newUrl = `/dashboard?section=topics&content=${contentItem.id}`;
        window.history.pushState({}, '', newUrl);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } catch (error) {
      console.error('Error accessing content:', error);
      toast({
        title: "Erro",
        description: "Erro ao acessar conteúdo",
        variant: "destructive",
      });
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'pro': return <Crown className="w-4 h-4" />;
      case 'vip': return <Gem className="w-4 h-4" />;
      case 'premium': return <Sparkles className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro': return 'bg-plan-pro text-white';
      case 'vip': return 'bg-plan-vip text-white';
      case 'premium': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      default: return 'bg-plan-free text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'published': return 'bg-success text-white';
      case 'maintenance': return 'bg-warning text-white';
      case 'blocked': return 'bg-destructive text-white';
      case 'draft': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'published': return 'Publicado';
      case 'maintenance': return 'Manutenção';
      case 'blocked': return 'Bloqueado';
      case 'draft': return 'Rascunho';
      default: return status;
    }
  };

  const getSectionTitle = () => {
    return title;
  };

  const getSectionIcon = () => {
    return <FileText className="w-6 h-6" />;
  };

  const canAccess = (contentPlan: string) => {
    // Premium pode ser acessado por qualquer plano
    if (contentPlan === 'premium') {
      return true;
    }
    const userLevel = planHierarchy[userPlan] || 0;
    const requiredLevel = planHierarchy[contentPlan as keyof typeof planHierarchy] || 0;
    return userLevel >= requiredLevel;
  };

  const getActionIcon = (contentItem: Content) => {
    if (contentItem.video_url) {
      return <Play className="w-4 h-4 mr-2" />;
    }
    return <ExternalLink className="w-4 h-4 mr-2" />;
  };

  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        {getSectionIcon()}
        <h1 className="text-3xl font-bold text-foreground">{getSectionTitle()}</h1>
      </div>

      {content.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              Nenhum {getSectionTitle().toLowerCase()} disponível no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {content.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {item.hero_image_url && (
                <div className="h-48 bg-cover bg-center" 
                     style={{ backgroundImage: `url(${item.hero_image_url})` }} />
              )}
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <div className="flex flex-col gap-2">
                    <Badge className={getPlanColor(item.required_plan)}>
                      {getPlanIcon(item.required_plan)}
                      <span className="ml-1 uppercase">{item.required_plan}</span>
                    </Badge>
                    <Badge className={getStatusColor(item.status)}>
                      {getStatusText(item.status)}
                    </Badge>
                  </div>
                </div>
                {item.description && (
                  <CardDescription>{item.description}</CardDescription>
                )}
                {item.release_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Lançamento: {new Date(item.release_date).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {(item.status !== 'active' && item.status !== 'published') ? (
                  <Button variant="outline" className="w-full" disabled>
                    {getStatusText(item.status)}
                  </Button>
                ) : !canAccess(item.required_plan) ? (
                  <Button 
                    variant="secondary" 
                    className="w-full"
                     onClick={navigateToPlans}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Upgrade Necessário
                  </Button>
                 ) : isContentLocked(item).locked ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Calendar className="w-4 h-4 mr-2" />
                    Bloqueado Temporariamente
                  </Button>
                 ) : item.password_protected ? (
                  <Button 
                    className="w-full" 
                    onClick={() => handleAccessContent(item)}
                  >
                    <KeyRound className="w-4 h-4 mr-2" />
                    Acessar com Senha
                  </Button>
                 ) : (
                  <Button 
                    className="w-full" 
                    onClick={() => handleAccessContent(item)}
                  >
                    {getActionIcon(item)}
                    Acessar
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conteúdo Protegido</DialogTitle>
            <DialogDescription>
              Este conteúdo está protegido por senha. Digite a senha para acessar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Digite a senha"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handlePasswordSubmit();
                  }
                }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setPasswordDialogOpen(false);
                setPasswordInput("");
                setSelectedContent(null);
              }}>
                Cancelar
              </Button>
              <Button onClick={handlePasswordSubmit}>
                Acessar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* YouTube Video Player Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <div className="relative">
            <Button 
              onClick={() => setSelectedVideo(null)}
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
            {selectedVideo && (
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&rel=0`}
                  title={selectedVideo.title}
                  className="w-full h-full rounded-lg"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            )}
            {selectedVideo && (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">{selectedVideo.title}</h3>
                {selectedVideo.description && (
                  <p className="text-sm text-muted-foreground">{selectedVideo.description}</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
