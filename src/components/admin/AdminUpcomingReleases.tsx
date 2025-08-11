
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Edit, Trash2, Plus, Clock, Rocket } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UpcomingRelease {
  id: string;
  title: string;
  description: string | null;
  release_date: string;
  target_plans: string[];
  is_active: boolean;
  countdown_enabled: boolean;
  announcement_image: string | null;
  content_preview: string | null;
  created_at: string;
  updated_at: string;
}

export const AdminUpcomingReleases = () => {
  const [releases, setReleases] = useState<UpcomingRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRelease, setEditingRelease] = useState<UpcomingRelease | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [releaseDate, setReleaseDate] = useState<Date | undefined>();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_plans: ['free', 'vip', 'pro'],
    is_active: true,
    countdown_enabled: true,
    announcement_image: '',
    content_preview: ''
  });

  useEffect(() => {
    fetchReleases();
  }, []);

  const fetchReleases = async () => {
    try {
      const { data, error } = await supabase
        .from('upcoming_releases')
        .select('*')
        .order('release_date', { ascending: true });

      if (error) throw error;
      setReleases(data || []);
    } catch (error: any) {
      console.error('Error fetching upcoming releases:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar próximos lançamentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "Título é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!releaseDate) {
      toast({
        title: "Erro",
        description: "Data de lançamento é obrigatória",
        variant: "destructive",
      });
      return;
    }

    try {
      const releaseData = {
        ...formData,
        release_date: releaseDate.toISOString()
      };

      if (editingRelease) {
        const { error } = await supabase
          .from('upcoming_releases')
          .update(releaseData)
          .eq('id', editingRelease.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Lançamento atualizado com sucesso",
        });
      } else {
        const { error } = await supabase
          .from('upcoming_releases')
          .insert([releaseData]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Lançamento criado com sucesso",
        });
      }

      resetForm();
      fetchReleases();
    } catch (error: any) {
      console.error('Error saving upcoming release:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar lançamento",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      target_plans: ['free', 'vip', 'pro'],
      is_active: true,
      countdown_enabled: true,
      announcement_image: '',
      content_preview: ''
    });
    setEditingRelease(null);
    setShowForm(false);
    setReleaseDate(undefined);
  };

  const startEdit = (release: UpcomingRelease) => {
    setEditingRelease(release);
    setFormData({
      title: release.title,
      description: release.description || '',
      target_plans: release.target_plans,
      is_active: release.is_active,
      countdown_enabled: release.countdown_enabled,
      announcement_image: release.announcement_image || '',
      content_preview: release.content_preview || ''
    });
    setReleaseDate(new Date(release.release_date));
    setShowForm(true);
  };

  const toggleActive = async (release: UpcomingRelease) => {
    try {
      const { error } = await supabase
        .from('upcoming_releases')
        .update({ is_active: !release.is_active })
        .eq('id', release.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Lançamento ${!release.is_active ? 'ativado' : 'desativado'} com sucesso`,
      });

      fetchReleases();
    } catch (error: any) {
      console.error('Error toggling release:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar lançamento",
        variant: "destructive",
      });
    }
  };

  const deleteRelease = async (releaseId: string) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;

    try {
      const { error } = await supabase
        .from('upcoming_releases')
        .delete()
        .eq('id', releaseId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Lançamento excluído com sucesso",
      });

      fetchReleases();
    } catch (error: any) {
      console.error('Error deleting release:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir lançamento",
        variant: "destructive",
      });
    }
  };

  const handlePlanToggle = (plan: string) => {
    setFormData(prev => ({
      ...prev,
      target_plans: prev.target_plans.includes(plan)
        ? prev.target_plans.filter(p => p !== plan)
        : [...prev.target_plans, plan]
    }));
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-plan-free text-white';
      case 'vip': return 'bg-plan-vip text-white';
      case 'pro': return 'bg-plan-pro text-white';
      default: return 'bg-plan-free text-white';
    }
  };

  const isReleased = (releaseDate: string) => {
    return new Date(releaseDate) <= new Date();
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-futuristic-primary">Próximos Lançamentos</h2>
          <p className="text-muted-foreground">Gerencie anúncios de novos conteúdos e funcionalidades</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-futuristic-gradient hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Novo Lançamento
        </Button>
      </div>

      {showForm && (
        <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
          <CardHeader>
            <CardTitle className="text-futuristic-primary">
              {editingRelease ? 'Editar Lançamento' : 'Novo Lançamento'}
            </CardTitle>
            <CardDescription>
              Configure anúncios de próximos conteúdos e funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Título do lançamento"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Data de Lançamento *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {releaseDate ? format(releaseDate, "dd/MM/yyyy HH:mm") : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={releaseDate}
                        onSelect={setReleaseDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do lançamento"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content_preview">Preview do Conteúdo</Label>
                <Textarea
                  id="content_preview"
                  value={formData.content_preview}
                  onChange={(e) => setFormData({ ...formData, content_preview: e.target.value })}
                  placeholder="Prévia ou resumo do que será lançado"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="announcement_image">Imagem de Anúncio (URL)</Label>
                <Input
                  id="announcement_image"
                  value={formData.announcement_image}
                  onChange={(e) => setFormData({ ...formData, announcement_image: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-3">
                <Label>Planos que receberão o lançamento</Label>
                <div className="flex gap-4">
                  {['free', 'vip', 'pro'].map((plan) => (
                    <label key={plan} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.target_plans.includes(plan)}
                        onChange={() => handlePlanToggle(plan)}
                      />
                      <span className="text-sm capitalize">{plan === 'free' ? 'Gratuito' : plan.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Lançamento ativo</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="countdown_enabled"
                    checked={formData.countdown_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, countdown_enabled: checked })}
                  />
                  <Label htmlFor="countdown_enabled">Mostrar countdown</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-futuristic-gradient hover:opacity-90">
                  {editingRelease ? 'Atualizar' : 'Criar'} Lançamento
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {releases.length === 0 ? (
          <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center space-y-2">
                <Rocket className="w-12 h-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">Nenhum lançamento programado ainda</p>
                <Button onClick={() => setShowForm(true)} variant="outline">
                  Criar primeiro lançamento
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          releases.map((release) => (
            <Card key={release.id} className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-futuristic-primary">{release.title}</CardTitle>
                    <div className="flex gap-2">
                      {release.target_plans.map((plan) => (
                        <Badge key={plan} className={getPlanBadgeColor(plan)}>
                          {plan === 'free' ? 'Gratuito' : plan.toUpperCase()}
                        </Badge>
                      ))}
                      <Badge variant={release.is_active ? "default" : "secondary"}>
                        {release.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      {release.countdown_enabled && (
                        <Badge variant="outline" className="text-futuristic-neon">
                          <Clock className="w-3 h-3 mr-1" />
                          Countdown
                        </Badge>
                      )}
                      {isReleased(release.release_date) && (
                        <Badge className="bg-green-500 text-white">
                          Lançado
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-futuristic-accent">
                      Lançamento: {format(new Date(release.release_date), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(release)}
                      className={release.is_active ? "border-yellow-500 text-yellow-500" : "border-green-500 text-green-500"}
                    >
                      {release.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => startEdit(release)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteRelease(release.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {(release.description || release.content_preview) && (
                <CardContent className="space-y-2">
                  {release.description && (
                    <p className="text-muted-foreground">{release.description}</p>
                  )}
                  {release.content_preview && (
                    <div className="p-3 bg-futuristic-primary/10 rounded-lg">
                      <p className="text-sm text-futuristic-primary font-medium mb-1">Preview:</p>
                      <p className="text-sm">{release.content_preview}</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
