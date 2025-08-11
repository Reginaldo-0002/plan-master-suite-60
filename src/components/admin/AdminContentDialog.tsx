
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
      <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col p-0">
        {/* Header fixo */}
        <div className="px-6 py-4 border-b bg-background sticky top-0 z-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              {contentItem?.id ? 'Editar' : 'Criar'} {getContentTypeLabel(contentType)}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Preencha os campos abaixo para {contentItem?.id ? 'editar' : 'criar'} o conteúdo.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Área de conteúdo com scroll */}
        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-6">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-foreground">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Digite o título..."
                className="w-full"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-foreground">
                Descrição
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o conteúdo..."
                rows={4}
                className="w-full resize-none"
              />
            </div>

            {/* Plano Necessário */}
            <div className="space-y-2">
              <Label htmlFor="required_plan" className="text-sm font-medium text-foreground">
                Plano Necessário
              </Label>
              <Select 
                value={formData.required_plan} 
                onValueChange={(value: any) => setFormData({ ...formData, required_plan: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">🆓 Gratuito</SelectItem>
                  <SelectItem value="vip">⭐ VIP</SelectItem>
                  <SelectItem value="pro">💎 Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* URL do Vídeo */}
            <div className="space-y-2">
              <Label htmlFor="video_url" className="text-sm font-medium text-foreground">
                🎥 URL do Vídeo (opcional)
              </Label>
              <Input
                id="video_url"
                value={formData.video_url || ""}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full"
              />
            </div>

            {/* Ordem de Exibição */}
            <div className="space-y-2">
              <Label htmlFor="order_index" className="text-sm font-medium text-foreground">
                📊 Ordem de Exibição
              </Label>
              <Input
                id="order_index"
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                className="w-full"
              />
            </div>

            {/* Switches */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active" className="text-sm font-medium text-foreground">
                  ✅ Ativo
                </Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_in_carousel" className="text-sm font-medium text-foreground">
                  🎠 Exibir no Carrossel
                </Label>
                <Switch
                  id="show_in_carousel"
                  checked={formData.show_in_carousel}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_in_carousel: checked })}
                />
              </div>
            </div>

            {/* Campos do Carrossel */}
            {formData.show_in_carousel && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <h4 className="text-sm font-semibold text-foreground">Configurações do Carrossel</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="carousel_image_url" className="text-sm font-medium text-foreground">
                    🖼️ URL da Imagem do Carrossel
                  </Label>
                  <Input
                    id="carousel_image_url"
                    value={formData.carousel_image_url || ""}
                    onChange={(e) => setFormData({ ...formData, carousel_image_url: e.target.value })}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="carousel_order" className="text-sm font-medium text-foreground">
                    🔢 Ordem no Carrossel
                  </Label>
                  <Input
                    id="carousel_order"
                    type="number"
                    value={formData.carousel_order}
                    onChange={(e) => setFormData({ ...formData, carousel_order: parseInt(e.target.value) || 0 })}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Espaço extra no final para garantir que tudo seja acessível */}
            <div className="h-4"></div>
          </div>
        </ScrollArea>

        {/* Footer fixo com botões */}
        <div className="px-6 py-4 border-t bg-background sticky bottom-0 z-10">
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={isLoading}
              className="min-w-[100px]"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isLoading}
              className="min-w-[140px]"
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
      </DialogContent>
    </Dialog>
  );
};
