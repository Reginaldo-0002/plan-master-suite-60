import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Edit, Trash2, Plus, Eye, EyeOff, Users, Clock } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ContentType = "course" | "tutorial" | "product" | "tool";
type UserPlan = "free" | "vip" | "pro";

interface Content {
  id: string;
  title: string;
  description: string | null;
  content_type: ContentType;
  required_plan: UserPlan;
  status: string;
  hero_image_url: string | null;
  carousel_image_url: string | null;
  show_in_carousel: boolean;
  carousel_order: number;
  scheduled_publish_at: string | null;
  auto_hide_at: string | null;
  target_users: string[] | null;
  is_active: boolean;
  created_at: string;
  estimated_duration: number | null;
  difficulty_level: string;
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  plan: UserPlan;
}

export const AdminContentManagement = () => {
  const [contents, setContents] = useState<Content[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [publishDate, setPublishDate] = useState<Date | undefined>();
  const [hideDate, setHideDate] = useState<Date | undefined>();
  const { toast } = useToast();

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content_type: "course" as ContentType,
    required_plan: "free" as UserPlan,
    hero_image_url: "",
    carousel_image_url: "",
    show_in_carousel: false,
    carousel_order: 0,
    estimated_duration: 0,
    difficulty_level: "beginner"
  });

  useEffect(() => {
    fetchContents();
    fetchUsers();
  }, []);

  const fetchContents = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedData: Content[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        content_type: item.content_type as ContentType,
        required_plan: item.required_plan as UserPlan,
        status: item.status || 'draft',
        hero_image_url: item.hero_image_url,
        carousel_image_url: item.carousel_image_url,
        show_in_carousel: item.show_in_carousel || false,
        carousel_order: item.carousel_order || 0,
        scheduled_publish_at: item.scheduled_publish_at,
        auto_hide_at: item.auto_hide_at,
        target_users: item.target_users,
        is_active: item.is_active !== false,
        created_at: item.created_at,
        estimated_duration: item.estimated_duration,
        difficulty_level: item.difficulty_level || 'beginner'
      }));

      setContents(transformedData);
    } catch (error: any) {
      console.error('Error fetching contents:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar conteúdos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, plan')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
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

    try {
      const contentData = {
        title: formData.title,
        description: formData.description,
        content_type: formData.content_type,
        required_plan: formData.required_plan,
        hero_image_url: formData.hero_image_url,
        carousel_image_url: formData.carousel_image_url,
        show_in_carousel: formData.show_in_carousel,
        carousel_order: formData.carousel_order,
        estimated_duration: formData.estimated_duration,
        difficulty_level: formData.difficulty_level,
        scheduled_publish_at: publishDate?.toISOString(),
        auto_hide_at: hideDate?.toISOString(),
        target_users: selectedUsers.length > 0 ? selectedUsers : null,
        is_active: true
      };

      if (editingContent) {
        const { error } = await supabase
          .from('content')
          .update(contentData)
          .eq('id', editingContent.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Conteúdo atualizado com sucesso",
        });
      } else {
        const { error } = await supabase
          .from('content')
          .insert([contentData]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Conteúdo criado com sucesso",
        });
      }

      resetForm();
      fetchContents();
    } catch (error: any) {
      console.error('Error saving content:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar conteúdo",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      content_type: "course",
      required_plan: "free",
      hero_image_url: "",
      carousel_image_url: "",
      show_in_carousel: false,
      carousel_order: 0,
      estimated_duration: 0,
      difficulty_level: "beginner"
    });
    setEditingContent(null);
    setShowForm(false);
    setSelectedUsers([]);
    setPublishDate(undefined);
    setHideDate(undefined);
  };

  const startEdit = (content: Content) => {
    setEditingContent(content);
    setFormData({
      title: content.title,
      description: content.description || "",
      content_type: content.content_type,
      required_plan: content.required_plan,
      hero_image_url: content.hero_image_url || "",
      carousel_image_url: content.carousel_image_url || "",
      show_in_carousel: content.show_in_carousel,
      carousel_order: content.carousel_order,
      estimated_duration: content.estimated_duration || 0,
      difficulty_level: content.difficulty_level
    });
    setSelectedUsers(content.target_users || []);
    setPublishDate(content.scheduled_publish_at ? new Date(content.scheduled_publish_at) : undefined);
    setHideDate(content.auto_hide_at ? new Date(content.auto_hide_at) : undefined);
    setShowForm(true);
  };

  const toggleVisibility = async (content: Content) => {
    try {
      const { error } = await supabase
        .from('content')
        .update({ is_active: !content.is_active })
        .eq('id', content.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Conteúdo ${!content.is_active ? 'ativado' : 'desativado'} com sucesso`,
      });

      fetchContents();
    } catch (error: any) {
      console.error('Error toggling visibility:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar visibilidade",
        variant: "destructive",
      });
    }
  };

  const deleteContent = async (contentId: string) => {
    if (!confirm("Tem certeza que deseja excluir este conteúdo?")) return;

    try {
      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', contentId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conteúdo excluído com sucesso",
      });

      fetchContents();
    } catch (error: any) {
      console.error('Error deleting content:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir conteúdo",
        variant: "destructive",
      });
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-plan-free text-white';
      case 'vip': return 'bg-plan-vip text-white';
      case 'pro': return 'bg-plan-pro text-white';
      default: return 'bg-plan-free text-white';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500 text-white';
      case 'draft': return 'bg-yellow-500 text-white';
      case 'scheduled': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-futuristic-primary">Gestão de Conteúdo</h2>
        <Button onClick={() => setShowForm(true)} className="bg-futuristic-gradient hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Novo Conteúdo
        </Button>
      </div>

      {showForm && (
        <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
          <CardHeader>
            <CardTitle className="text-futuristic-primary">
              {editingContent ? 'Editar Conteúdo' : 'Novo Conteúdo'}
            </CardTitle>
            <CardDescription>
              Configure apenas os metadados do conteúdo. Os vídeos e materiais serão adicionados nos tópicos.
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
                    placeholder="Título do conteúdo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content_type">Tipo de Conteúdo</Label>
                  <Select value={formData.content_type} onValueChange={(value: ContentType) => setFormData({ ...formData, content_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="course">Curso</SelectItem>
                      <SelectItem value="tutorial">Tutorial</SelectItem>
                      <SelectItem value="product">Produto</SelectItem>
                      <SelectItem value="tool">Ferramenta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do conteúdo"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="required_plan">Plano Necessário</Label>
                  <Select value={formData.required_plan} onValueChange={(value: UserPlan) => setFormData({ ...formData, required_plan: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Gratuito</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="difficulty_level">Nível</Label>
                  <Select value={formData.difficulty_level} onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Iniciante</SelectItem>
                      <SelectItem value="intermediate">Intermediário</SelectItem>
                      <SelectItem value="advanced">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimated_duration">Duração (min)</Label>
                  <Input
                    id="estimated_duration"
                    type="number"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hero_image">Imagem Principal (URL)</Label>
                  <Input
                    id="hero_image"
                    value={formData.hero_image_url}
                    onChange={(e) => setFormData({ ...formData, hero_image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carousel_image">Imagem do Carrossel (URL)</Label>
                  <Input
                    id="carousel_image"
                    value={formData.carousel_image_url}
                    onChange={(e) => setFormData({ ...formData, carousel_image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.show_in_carousel}
                    onChange={(e) => setFormData({ ...formData, show_in_carousel: e.target.checked })}
                  />
                  <span className="text-sm">Mostrar no carrossel</span>
                </label>
                {formData.show_in_carousel && (
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="carousel_order" className="text-sm">Ordem:</Label>
                    <Input
                      id="carousel_order"
                      type="number"
                      value={formData.carousel_order}
                      onChange={(e) => setFormData({ ...formData, carousel_order: parseInt(e.target.value) || 0 })}
                      className="w-20"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-futuristic-accent">Agendamento e Visibilidade</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Publicação</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {publishDate ? format(publishDate, "dd/MM/yyyy HH:mm") : "Publicar agora"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={publishDate}
                          onSelect={setPublishDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Data de Ocultação</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {hideDate ? format(hideDate, "dd/MM/yyyy HH:mm") : "Nunca ocultar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={hideDate}
                          onSelect={setHideDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Usuários Específicos (opcional)</Label>
                  <Select value={selectedUsers.join(',')} onValueChange={(value) => setSelectedUsers(value ? value.split(',') : [])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione usuários específicos ou deixe vazio para todos" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.full_name || 'Usuário sem nome'} ({user.plan})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedUsers.map((userId) => {
                        const user = users.find(u => u.user_id === userId);
                        return (
                          <Badge key={userId} variant="outline" className="text-xs">
                            {user?.full_name || 'Usuário'}
                            <button
                              onClick={() => setSelectedUsers(selectedUsers.filter(id => id !== userId))}
                              className="ml-2 text-red-500"
                            >
                              ×
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-futuristic-gradient hover:opacity-90">
                  {editingContent ? 'Atualizar' : 'Criar'} Conteúdo
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
        {contents.map((content) => (
          <Card key={content.id} className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-futuristic-primary">{content.title}</CardTitle>
                  <div className="flex gap-2">
                    <Badge className={getPlanBadgeColor(content.required_plan)}>
                      {content.required_plan.toUpperCase()}
                    </Badge>
                    <Badge className={getStatusBadgeColor(content.status)}>
                      {content.status}
                    </Badge>
                    <Badge variant="outline">
                      {content.content_type}
                    </Badge>
                    {content.target_users && (
                      <Badge variant="outline" className="text-futuristic-accent">
                        <Users className="w-3 h-3 mr-1" />
                        {content.target_users.length} usuários
                      </Badge>
                    )}
                    {content.scheduled_publish_at && (
                      <Badge variant="outline" className="text-futuristic-neon">
                        <Clock className="w-3 h-3 mr-1" />
                        Agendado
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleVisibility(content)}
                    className={content.is_active ? "border-green-500 text-green-500" : "border-red-500 text-red-500"}
                  >
                    {content.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => startEdit(content)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteContent(content.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {content.description && (
              <CardContent>
                <p className="text-muted-foreground">{content.description}</p>
                {content.estimated_duration > 0 && (
                  <p className="text-sm text-futuristic-accent mt-2">
                    Duração estimada: {content.estimated_duration} minutos
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
