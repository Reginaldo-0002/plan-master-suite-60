
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ContentItem {
  id?: string;
  title: string;
  description: string;
  content_type: 'course' | 'tool' | 'tutorial' | 'product';
  required_plan: 'free' | 'vip' | 'pro';
  is_active: boolean;
  order_index: number;
  show_in_carousel: boolean;
  carousel_image_url?: string;
  carousel_order: number;
  video_url?: string;
}

interface AdminContentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contentItem?: ContentItem | null;
  contentType: 'course' | 'tool' | 'tutorial' | 'product';
}

export const AdminContentDialog = ({ isOpen, onClose, contentItem, contentType }: AdminContentDialogProps) => {
  const [formData, setFormData] = useState<ContentItem>({
    title: "",
    description: "",
    content_type: contentType,
    required_plan: "free",
    is_active: true,
    order_index: 0,
    show_in_carousel: false,
    carousel_order: 0,
    video_url: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (contentItem) {
      setFormData({
        ...contentItem,
        content_type: contentType
      });
    } else {
      setFormData({
        title: "",
        description: "",
        content_type: contentType,
        required_plan: "free",
        is_active: true,
        order_index: 0,
        show_in_carousel: false,
        carousel_order: 0,
        video_url: ""
      });
    }
  }, [contentItem, contentType, isOpen]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "O título é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const dataToSave = {
        title: formData.title,
        description: formData.description,
        content_type: formData.content_type,
        required_plan: formData.required_plan,
        is_active: formData.is_active,
        order_index: formData.order_index,
        show_in_carousel: formData.show_in_carousel,
        carousel_image_url: formData.carousel_image_url || null,
        carousel_order: formData.carousel_order,
        video_url: formData.video_url || null
      };

      let error;
      if (contentItem?.id) {
        // Update existing content
        const result = await supabase
          .from('content')
          .update(dataToSave)
          .eq('id', contentItem.id);
        error = result.error;
      } else {
        // Create new content
        const result = await supabase
          .from('content')
          .insert(dataToSave);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${contentItem?.id ? 'Conteúdo atualizado' : 'Conteúdo criado'} com sucesso`,
      });

      onClose();
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar conteúdo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'course': return 'Curso';
      case 'tool': return 'Ferramenta';
      case 'tutorial': return 'Tutorial';
      case 'product': return 'Produto';
      default: return type;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl h-[90vh] max-h-[800px] p-0 overflow-hidden futuristic-dialog">
        <div className="flex flex-col h-full">
          {/* Header fixo */}
          <DialogHeader className="px-6 py-4 border-b border-border/20 bg-background/95 backdrop-blur-sm">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              {contentItem?.id ? 'Editar' : 'Criar'} {getContentTypeLabel(contentType)}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              Preencha os campos abaixo para {contentItem?.id ? 'editar' : 'criar'} o conteúdo.
            </DialogDescription>
          </DialogHeader>

          {/* Área de conteúdo rolável */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Campos básicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-semibold text-foreground">
                      Título <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Digite o título..."
                      className="futuristic-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="required_plan" className="text-sm font-semibold text-foreground">
                      Plano Necessário
                    </Label>
                    <Select 
                      value={formData.required_plan} 
                      onValueChange={(value: any) => setFormData({ ...formData, required_plan: value })}
                    >
                      <SelectTrigger className="futuristic-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="futuristic-dropdown">
                        <SelectItem value="free">🆓 Gratuito</SelectItem>
                        <SelectItem value="vip">⭐ VIP</SelectItem>
                        <SelectItem value="pro">💎 Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold text-foreground">
                    Descrição
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva o conteúdo..."
                    rows={4}
                    className="futuristic-input resize-none"
                  />
                </div>

                {/* URL do vídeo */}
                <div className="space-y-2">
                  <Label htmlFor="video_url" className="text-sm font-semibold text-foreground">
                    🎥 URL do Vídeo (opcional)
                  </Label>
                  <Input
                    id="video_url"
                    value={formData.video_url || ""}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=..."
                    className="futuristic-input"
                  />
                </div>

                {/* Configurações básicas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="order_index" className="text-sm font-semibold text-foreground">
                      📊 Ordem de Exibição
                    </Label>
                    <Input
                      id="order_index"
                      type="number"
                      value={formData.order_index}
                      onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                      className="futuristic-input"
                    />
                  </div>
                  <div className="flex items-center space-x-3 pt-8">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      className="futuristic-switch"
                    />
                    <Label htmlFor="is_active" className="text-sm font-semibold text-foreground cursor-pointer">
                      ✅ Ativo
                    </Label>
                  </div>
                </div>

                {/* Configurações do carrossel */}
                <div className="space-y-6 border-t border-border/20 pt-6">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="show_in_carousel"
                      checked={formData.show_in_carousel}
                      onCheckedChange={(checked) => setFormData({ ...formData, show_in_carousel: checked })}
                      className="futuristic-switch"
                    />
                    <Label htmlFor="show_in_carousel" className="text-sm font-semibold text-foreground cursor-pointer">
                      🎠 Exibir no Carrossel
                    </Label>
                  </div>

                  {formData.show_in_carousel && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                      <div className="space-y-2">
                        <Label htmlFor="carousel_image_url" className="text-sm font-semibold text-foreground">
                          🖼️ URL da Imagem do Carrossel (1920x1080)
                        </Label>
                        <Input
                          id="carousel_image_url"
                          value={formData.carousel_image_url || ""}
                          onChange={(e) => setFormData({ ...formData, carousel_image_url: e.target.value })}
                          placeholder="https://exemplo.com/imagem.jpg"
                          className="futuristic-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="carousel_order" className="text-sm font-semibold text-foreground">
                          🔢 Ordem no Carrossel
                        </Label>
                        <Input
                          id="carousel_order"
                          type="number"
                          value={formData.carousel_order}
                          onChange={(e) => setFormData({ ...formData, carousel_order: parseInt(e.target.value) || 0 })}
                          className="futuristic-input"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Espaço extra para garantir que o último campo seja visível */}
                <div className="h-4"></div>
              </div>
            </ScrollArea>
          </div>

          {/* Footer com botões fixos */}
          <div className="px-6 py-4 border-t border-border/20 bg-background/95 backdrop-blur-sm">
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={isLoading}
                className="futuristic-button-secondary"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="futuristic-button-primary"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    💾 Salvar Conteúdo
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
