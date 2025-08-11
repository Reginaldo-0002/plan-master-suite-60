
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
      const scrollContainer = document.querySelector('.admin-content-scroll-area');
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
    <>
      <style>{`
        .admin-dialog-container {
          max-width: 64rem;
          width: 100%;
          height: 95vh;
          padding: 0;
          gap: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .admin-dialog-header {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid hsl(var(--border));
          background: hsl(var(--background) / 0.95);
          backdrop-filter: blur(4px);
          flex-shrink: 0;
          position: relative;
          z-index: 10;
        }

        .admin-header-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: hsl(var(--foreground));
          margin-bottom: 0.5rem;
        }

        .admin-header-description {
          font-size: 0.875rem;
          color: hsl(var(--muted-foreground));
        }

        .admin-scroll-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 0.75rem;
          padding: 0.5rem;
          background: hsl(var(--primary) / 0.1);
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--primary) / 0.2);
          color: hsl(var(--primary));
        }

        .admin-content-scroll-area {
          flex: 1;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--primary) / 0.3) hsl(var(--muted));
          position: relative;
        }

        .admin-content-scroll-area::-webkit-scrollbar {
          width: 8px;
        }

        .admin-content-scroll-area::-webkit-scrollbar-track {
          background: hsl(var(--muted));
          border-radius: 4px;
        }

        .admin-content-scroll-area::-webkit-scrollbar-thumb {
          background: hsl(var(--primary) / 0.5);
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        .admin-content-scroll-area::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.7);
        }

        .admin-form-content {
          padding: 1rem 1.5rem;
        }

        .admin-field-group {
          margin-bottom: 1.5rem;
        }

        .admin-field-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: hsl(var(--foreground));
          margin-bottom: 0.5rem;
        }

        .admin-field-label.required::after {
          content: ' *';
          color: hsl(var(--destructive));
        }

        .admin-switches-group {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: hsl(var(--muted) / 0.3);
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--border) / 0.5);
        }

        .admin-switch-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .admin-switch-item:last-child {
          margin-bottom: 0;
        }

        .admin-switch-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: hsl(var(--foreground));
        }

        .admin-carousel-section {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: hsl(var(--primary) / 0.05);
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--primary) / 0.2);
        }

        .admin-carousel-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: hsl(var(--primary));
          margin-bottom: 1rem;
        }

        .admin-scroll-padding {
          height: 2rem;
        }

        .admin-dialog-footer {
          border-top: 1px solid hsl(var(--border));
          background: hsl(var(--background) / 0.95);
          backdrop-filter: blur(4px);
          flex-shrink: 0;
          position: relative;
          z-index: 10;
        }

        .admin-footer-shadow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1rem;
          background: linear-gradient(to bottom, transparent, hsl(var(--background) / 0.2));
          pointer-events: none;
          transform: translateY(-100%);
        }

        .admin-footer-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
        }

        @media (max-width: 768px) {
          .admin-dialog-container {
            max-width: 95vw;
            height: 90vh;
          }

          .admin-form-content,
          .admin-dialog-header,
          .admin-footer-buttons {
            padding-left: 1rem;
            padding-right: 1rem;
          }

          .admin-footer-buttons {
            flex-direction: column;
            gap: 0.5rem;
          }
        }

        @media (max-height: 600px) {
          .admin-dialog-container {
            height: 98vh;
          }

          .admin-dialog-header {
            padding-top: 0.75rem;
            padding-bottom: 0.75rem;
          }

          .admin-footer-buttons {
            padding-top: 0.75rem;
            padding-bottom: 0.75rem;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="admin-dialog-container">
          {/* Header Fixo */}
          <div className="admin-dialog-header">
            <DialogHeader>
              <DialogTitle className="admin-header-title">
                {contentItem?.id ? 'Editar' : 'Criar'} {getContentTypeLabel(contentType)}
              </DialogTitle>
              <DialogDescription className="admin-header-description">
                Preencha os campos abaixo para {contentItem?.id ? 'editar' : 'criar'} o conteúdo.
              </DialogDescription>
            </DialogHeader>
            
            {/* Indicador de Scroll */}
            {showScrollIndicator && (
              <div className="admin-scroll-indicator">
                <ScrollText className="w-4 h-4 mr-2" />
                <span className="text-xs">Role para ver mais campos</span>
                <ChevronDown className="w-4 h-4 ml-2 animate-bounce" />
              </div>
            )}
          </div>

          {/* Área de Conteúdo Scrollável */}
          <div className="admin-content-scroll-area">
            <div className="admin-form-content">
              {/* Título */}
              <div className="admin-field-group">
                <Label htmlFor="title" className="admin-field-label required">
                  Título
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
              <div className="admin-field-group">
                <Label htmlFor="description" className="admin-field-label">
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
              <div className="admin-field-group">
                <Label htmlFor="required_plan" className="admin-field-label">
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
              <div className="admin-field-group">
                <Label htmlFor="video_url" className="admin-field-label">
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
              <div className="admin-field-group">
                <Label htmlFor="order_index" className="admin-field-label">
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
              <div className="admin-switches-group">
                <div className="admin-switch-item">
                  <Label htmlFor="is_active" className="admin-switch-label">
                    ✅ Conteúdo Ativo
                  </Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <div className="admin-switch-item">
                  <Label htmlFor="show_in_carousel" className="admin-switch-label">
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
                <div className="admin-carousel-section">
                  <h4 className="admin-carousel-title">🎠 Configurações do Carrossel</h4>
                  
                  <div className="admin-field-group">
                    <Label htmlFor="carousel_image_url" className="admin-field-label">
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
                  
                  <div className="admin-field-group">
                    <Label htmlFor="carousel_order" className="admin-field-label">
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

              {/* Espaço adicional para garantir que o último campo seja acessível */}
              <div className="admin-scroll-padding"></div>
            </div>
          </div>

          {/* Footer Fixo com Botões */}
          <div className="admin-dialog-footer">
            <div className="admin-footer-shadow"></div>
            <div className="admin-footer-buttons">
              <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
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
    </>
  );
};
