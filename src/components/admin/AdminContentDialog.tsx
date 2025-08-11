
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
import { Loader2, ChevronDown, ScrollText } from "lucide-react";

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
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
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

  // Verificar se há conteúdo para rolar
  useEffect(() => {
    const checkScrollable = () => {
      const scrollContainer = document.querySelector('.content-scroll-area');
      if (scrollContainer) {
        const isScrollable = scrollContainer.scrollHeight > scrollContainer.clientHeight;
        setShowScrollIndicator(isScrollable);
      }
    };

    if (isOpen) {
      setTimeout(checkScrollable, 100);
      window.addEventListener('resize', checkScrollable);
      return () => window.removeEventListener('resize', checkScrollable);
    }
  }, [isOpen, formData]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "O título é obrigatório",
        variant: "destructive",
      });
      
      // Auto-scroll para o campo título em caso de erro
      const titleField = document.getElementById('title');
      if (titleField) {
        titleField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        titleField.focus();
      }
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
        const result = await supabase
          .from('content')
          .update(dataToSave)
          .eq('id', contentItem.id);
        error = result.error;
      } else {
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
      <DialogContent className="fixed-dialog-container">
        {/* Header Fixo */}
        <div className="dialog-header">
          <DialogHeader>
            <DialogTitle className="header-title">
              {contentItem?.id ? 'Editar' : 'Criar'} {getContentTypeLabel(contentType)}
            </DialogTitle>
            <DialogDescription className="header-description">
              Preencha os campos abaixo para {contentItem?.id ? 'editar' : 'criar'} o conteúdo.
            </DialogDescription>
          </DialogHeader>
          
          {/* Indicador de Scroll */}
          {showScrollIndicator && (
            <div className="scroll-indicator">
              <ScrollText className="w-4 h-4 mr-2" />
              <span className="text-xs">Role para ver mais campos</span>
              <ChevronDown className="w-4 h-4 ml-2 animate-bounce" />
            </div>
          )}
        </div>

        {/* Área de Conteúdo Scrollável */}
        <div className="content-scroll-area">
          <div className="form-content">
            {/* Título */}
            <div className="field-group">
              <Label htmlFor="title" className="field-label required">
                Título
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Digite o título..."
                className="futuristic-input"
              />
            </div>

            {/* Descrição */}
            <div className="field-group">
              <Label htmlFor="description" className="field-label">
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

            {/* Plano Necessário */}
            <div className="field-group">
              <Label htmlFor="required_plan" className="field-label">
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

            {/* URL do Vídeo */}
            <div className="field-group">
              <Label htmlFor="video_url" className="field-label">
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

            {/* Ordem de Exibição */}
            <div className="field-group">
              <Label htmlFor="order_index" className="field-label">
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

            {/* Switches */}
            <div className="switches-group">
              <div className="switch-item">
                <Label htmlFor="is_active" className="switch-label">
                  ✅ Conteúdo Ativo
                </Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  className="futuristic-switch"
                />
              </div>

              <div className="switch-item">
                <Label htmlFor="show_in_carousel" className="switch-label">
                  🎠 Exibir no Carrossel
                </Label>
                <Switch
                  id="show_in_carousel"
                  checked={formData.show_in_carousel}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_in_carousel: checked })}
                  className="futuristic-switch"
                />
              </div>
            </div>

            {/* Campos do Carrossel */}
            {formData.show_in_carousel && (
              <div className="carousel-section">
                <h4 className="carousel-title">🎠 Configurações do Carrossel</h4>
                
                <div className="field-group">
                  <Label htmlFor="carousel_image_url" className="field-label">
                    🖼️ URL da Imagem do Carrossel
                  </Label>
                  <Input
                    id="carousel_image_url"
                    value={formData.carousel_image_url || ""}
                    onChange={(e) => setFormData({ ...formData, carousel_image_url: e.target.value })}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="futuristic-input"
                  />
                </div>
                
                <div className="field-group">
                  <Label htmlFor="carousel_order" className="field-label">
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

            {/* Espaço adicional para garantir que o último campo seja acessível */}
            <div className="scroll-padding"></div>
          </div>
        </div>

        {/* Footer Fixo com Botões */}
        <div className="dialog-footer">
          <div className="footer-shadow"></div>
          <div className="footer-buttons">
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

        <style jsx>{`
          .fixed-dialog-container {
            @apply max-w-4xl w-full h-[95vh] p-0 gap-0 flex flex-col overflow-hidden;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          }

          .dialog-header {
            @apply px-6 py-4 border-b bg-background/95 backdrop-blur-sm;
            flex-shrink: 0;
            position: relative;
            z-index: 10;
          }

          .header-title {
            @apply text-xl font-bold text-foreground mb-2;
          }

          .header-description {
            @apply text-sm text-muted-foreground;
          }

          .scroll-indicator {
            @apply flex items-center justify-center mt-3 p-2 bg-primary/10 rounded-lg border border-primary/20;
            color: hsl(var(--primary));
          }

          .content-scroll-area {
            @apply flex-1 overflow-y-auto;
            scrollbar-width: thin;
            scrollbar-color: hsl(var(--primary) / 0.3) hsl(var(--muted));
            position: relative;
          }

          .content-scroll-area::-webkit-scrollbar {
            width: 8px;
          }

          .content-scroll-area::-webkit-scrollbar-track {
            background: hsl(var(--muted));
            border-radius: 4px;
          }

          .content-scroll-area::-webkit-scrollbar-thumb {
            background: hsl(var(--primary) / 0.5);
            border-radius: 4px;
            transition: background 0.2s ease;
          }

          .content-scroll-area::-webkit-scrollbar-thumb:hover {
            background: hsl(var(--primary) / 0.7);
          }

          .form-content {
            @apply px-6 py-4;
          }

          .field-group {
            @apply mb-6;
          }

          .field-label {
            @apply block text-sm font-medium text-foreground mb-2;
          }

          .field-label.required::after {
            content: ' *';
            color: hsl(var(--destructive));
          }

          .switches-group {
            @apply space-y-4 mb-6 p-4 bg-muted/30 rounded-lg border border-border/50;
          }

          .switch-item {
            @apply flex items-center justify-between;
          }

          .switch-label {
            @apply text-sm font-medium text-foreground;
          }

          .carousel-section {
            @apply space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20 mb-6;
          }

          .carousel-title {
            @apply text-sm font-semibold text-primary mb-4;
          }

          .scroll-padding {
            @apply h-8;
          }

          .dialog-footer {
            @apply border-t bg-background/95 backdrop-blur-sm;
            flex-shrink: 0;
            position: relative;
            z-index: 10;
          }

          .footer-shadow {
            @apply absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-transparent to-background/20 pointer-events-none;
            transform: translateY(-100%);
          }

          .footer-buttons {
            @apply flex justify-end gap-3 px-6 py-4;
          }

          @media (max-width: 768px) {
            .fixed-dialog-container {
              @apply max-w-[95vw] h-[90vh];
            }

            .form-content {
              @apply px-4 py-3;
            }

            .dialog-header,
            .footer-buttons {
              @apply px-4;
            }

            .footer-buttons {
              @apply flex-col gap-2;
            }
          }

          @media (max-height: 600px) {
            .fixed-dialog-container {
              @apply h-[98vh];
            }

            .dialog-header {
              @apply py-3;
            }

            .footer-buttons {
              @apply py-3;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};
