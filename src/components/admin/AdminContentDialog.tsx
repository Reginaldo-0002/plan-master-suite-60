
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useErrorHandler } from "@/hooks/useErrorHandler";

interface Content {
  id?: string;
  title: string;
  description: string;
  content_type: 'product' | 'tool' | 'course' | 'tutorial';
  required_plan: 'free' | 'vip' | 'pro';
  video_url?: string;
  hero_image_url?: string;
  carousel_image_url?: string;
  is_active: boolean;
  show_in_carousel: boolean;
  carousel_order: number;
  status: 'draft' | 'published' | 'scheduled';
  published_at?: string;
  scheduled_publish_at?: string;
  tags?: string[];
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration?: number;
  order_index: number;
  password_protected?: boolean;
  content_password?: string;
  scheduled_lock?: boolean;
  lock_start_date?: string;
  lock_end_date?: string;
}

interface AdminContentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  content?: Content | null;
  onContentSaved: () => void;
}

export const AdminContentDialog = ({ isOpen, onClose, content, onContentSaved }: AdminContentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const [formData, setFormData] = useState<Content>({
    title: "",
    description: "",
    content_type: "tutorial",
    required_plan: "free",
    video_url: "",
    hero_image_url: "",
    carousel_image_url: "",
    is_active: true,
    show_in_carousel: false,
    carousel_order: 0,
    status: "draft",
    tags: [],
    difficulty_level: "beginner",
    estimated_duration: 0,
    order_index: 0,
    password_protected: false,
    content_password: "",
    scheduled_lock: false,
    lock_start_date: "",
    lock_end_date: ""
  });

  useEffect(() => {
    if (content) {
      setFormData({
        ...content,
        tags: content.tags || []
      });
      setTagInput(content.tags?.join(", ") || "");
    } else {
      setFormData({
        title: "",
        description: "",
        content_type: "tutorial",
        required_plan: "free",
        video_url: "",
        hero_image_url: "",
        carousel_image_url: "",
        is_active: true,
        show_in_carousel: false,
        carousel_order: 0,
        status: "draft",
        tags: [],
        difficulty_level: "beginner",
        estimated_duration: 0,
        order_index: 0,
        password_protected: false,
        content_password: "",
        scheduled_lock: false,
        lock_start_date: "",
        lock_end_date: ""
      });
      setTagInput("");
    }
  }, [content, isOpen]);

  const handleInputChange = (field: keyof Content, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTagsChange = (value: string) => {
    setTagInput(value);
    const tags = value.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0);
    setFormData(prev => ({ ...prev, tags }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast({
        title: "Erro de validação",
        description: "O título é obrigatório",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Erro de validação",
        description: "A descrição é obrigatória",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      // Don't include content_password in the initial save - it will be hashed separately
      const dataToSave = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        content_type: formData.content_type,
        required_plan: formData.required_plan,
        video_url: formData.video_url?.trim() || null,
        hero_image_url: formData.hero_image_url?.trim() || null,
        carousel_image_url: formData.carousel_image_url?.trim() || null,
        is_active: formData.is_active,
        show_in_carousel: formData.show_in_carousel,
        carousel_order: formData.carousel_order,
        status: formData.status,
        published_at: formData.status === 'published' ? new Date().toISOString() : null,
        scheduled_publish_at: formData.scheduled_publish_at || null,
        tags: formData.tags,
        difficulty_level: formData.difficulty_level,
        estimated_duration: formData.estimated_duration || null,
        order_index: formData.order_index,
        password_protected: formData.password_protected || false,
        scheduled_lock: formData.scheduled_lock || false,
        lock_start_date: formData.scheduled_lock ? formData.lock_start_date || null : null,
        lock_end_date: formData.scheduled_lock ? formData.lock_end_date || null : null,
        updated_at: new Date().toISOString()
      };

      let result;
      let contentId: string;
      
      if (content?.id) {
        result = await supabase
          .from('content')
          .update(dataToSave)
          .eq('id', content.id)
          .select();
        contentId = content.id;
      } else {
        result = await supabase
          .from('content')
          .insert([dataToSave])
          .select();
        contentId = result.data?.[0]?.id;
      }

      if (result.error) {
        throw result.error;
      }

      // If password was provided and password_protected is true, hash it server-side
      if (formData.password_protected && formData.content_password && formData.content_password.trim() !== '' && contentId) {
        const { error: hashError } = await supabase.rpc('hash_content_password', {
          content_id_param: contentId,
          plain_password: formData.content_password.trim()
        });

        if (hashError) {
          console.error('Error hashing password:', hashError);
          toast({
            title: "Aviso",
            description: "Conteúdo salvo, mas houve erro ao definir a senha. Tente novamente.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Sucesso",
        description: `Conteúdo ${content?.id ? 'atualizado' : 'criado'} com sucesso!`,
      });

      onContentSaved();
      onClose();

    } catch (error) {
      console.error('Error saving content:', error);
      handleError(error, {
        title: "Erro ao salvar conteúdo",
        showToast: true
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {content?.id ? 'Editar Conteúdo' : 'Criar Novo Conteúdo'}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados para {content?.id ? 'atualizar' : 'criar'} o conteúdo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Título do conteúdo"
                required
              />
            </div>

            <div>
              <Label htmlFor="content_type">Tipo de Conteúdo</Label>
              <Select value={formData.content_type} onValueChange={(value: any) => handleInputChange('content_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutorial">Tutorial</SelectItem>
                  <SelectItem value="product">Produto</SelectItem>
                  <SelectItem value="course">Curso</SelectItem>
                  <SelectItem value="tool">Ferramenta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descrição detalhada do conteúdo"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="video_url">URL do Vídeo</Label>
              <Input
                id="video_url"
                value={formData.video_url || ''}
                onChange={(e) => handleInputChange('video_url', e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

            <div>
              <Label htmlFor="hero_image_url">URL da Imagem Principal</Label>
              <Input
                id="hero_image_url"
                value={formData.hero_image_url || ''}
                onChange={(e) => handleInputChange('hero_image_url', e.target.value)}
                placeholder="https://cdn.site.com/imagem.jpg"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="carousel_image_url">URL da Imagem do Carrossel</Label>
            <Input
              id="carousel_image_url"
              value={formData.carousel_image_url || ''}
              onChange={(e) => handleInputChange('carousel_image_url', e.target.value)}
              placeholder="https://cdn.site.com/carousel.jpg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="required_plan">Plano Necessário</Label>
              <Select value={formData.required_plan} onValueChange={(value: any) => handleInputChange('required_plan', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="difficulty_level">Nível de Dificuldade</Label>
              <Select value={formData.difficulty_level} onValueChange={(value: any) => handleInputChange('difficulty_level', value)}>
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

            <div>
              <Label htmlFor="estimated_duration">Duração Estimada (min)</Label>
              <Input
                id="estimated_duration"
                type="number"
                value={formData.estimated_duration || ''}
                onChange={(e) => handleInputChange('estimated_duration', parseInt(e.target.value) || 0)}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="order_index">Ordem de Exibição</Label>
              <Input
                id="order_index"
                type="number"
                value={formData.order_index}
                onChange={(e) => handleInputChange('order_index', parseInt(e.target.value) || 0)}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="is_active">Ativo</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show_in_carousel"
                checked={formData.show_in_carousel}
                onCheckedChange={(checked) => handleInputChange('show_in_carousel', checked)}
              />
              <Label htmlFor="show_in_carousel">Mostrar no Carrossel</Label>
            </div>

            {formData.show_in_carousel && (
              <div>
                <Label htmlFor="carousel_order">Ordem no Carrossel</Label>
                <Input
                  id="carousel_order"
                  type="number"
                  value={formData.carousel_order}
                  onChange={(e) => handleInputChange('carousel_order', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                />
              </div>
            )}
          </div>

          {formData.status === 'scheduled' && (
            <div>
              <Label htmlFor="scheduled_publish_at">Data de Publicação Agendada</Label>
              <Input
                id="scheduled_publish_at"
                type="datetime-local"
                value={formData.scheduled_publish_at || ''}
                onChange={(e) => handleInputChange('scheduled_publish_at', e.target.value)}
              />
            </div>
          )}

          <div className="border-t pt-6 space-y-4">
            <h3 className="text-lg font-semibold">Bloqueios de Acesso</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="password_protected"
                  checked={formData.password_protected}
                  onCheckedChange={(checked) => handleInputChange('password_protected', checked)}
                />
                <Label htmlFor="password_protected">Proteger com Senha</Label>
              </div>

              {formData.password_protected && (
                <div>
                  <Label htmlFor="content_password">Senha do Conteúdo</Label>
                  <Input
                    id="content_password"
                    type="text"
                    value={formData.content_password || ''}
                    onChange={(e) => handleInputChange('content_password', e.target.value)}
                    placeholder="Digite a senha para acessar o conteúdo"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Os usuários precisarão inserir esta senha para acessar o conteúdo
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="scheduled_lock"
                  checked={formData.scheduled_lock}
                  onCheckedChange={(checked) => handleInputChange('scheduled_lock', checked)}
                />
                <Label htmlFor="scheduled_lock">Bloqueio por Agendamento</Label>
              </div>

              {formData.scheduled_lock && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lock_start_date">Data de Início do Bloqueio</Label>
                    <Input
                      id="lock_start_date"
                      type="datetime-local"
                      value={formData.lock_start_date || ''}
                      onChange={(e) => handleInputChange('lock_start_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lock_end_date">Data de Fim do Bloqueio</Label>
                    <Input
                      id="lock_end_date"
                      type="datetime-local"
                      value={formData.lock_end_date || ''}
                      onChange={(e) => handleInputChange('lock_end_date', e.target.value)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground col-span-2">
                    O conteúdo ficará bloqueado durante o período selecionado
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-6">
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              `${content?.id ? 'Atualizar' : 'Criar'} Conteúdo`
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
