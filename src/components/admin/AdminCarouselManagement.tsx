
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, Image, Save, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Content {
  id: string;
  title: string;
  carousel_image_url: string | null;
  carousel_order: number;
  show_in_carousel: boolean;
  content_type: 'product' | 'tool' | 'course' | 'tutorial';
  required_plan: 'free' | 'vip' | 'pro';
  is_active: boolean;
}

interface CarouselFormData {
  carousel_image_url: string;
  carousel_order: number;
  show_in_carousel: boolean;
}

export const AdminCarouselManagement = () => {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [formData, setFormData] = useState<CarouselFormData>({
    carousel_image_url: "",
    carousel_order: 0,
    show_in_carousel: false
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    try {
      console.log('Fetching contents for carousel management...');
      const { data, error } = await supabase
        .from('content')
        .select('id, title, carousel_image_url, carousel_order, show_in_carousel, content_type, required_plan, is_active')
        .order('carousel_order', { ascending: true });

      if (error) throw error;
      console.log('Contents fetched:', data?.length || 0);
      setContents(data || []);
    } catch (error) {
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

  const updateCarouselSettings = async () => {
    if (!editingContent) return;

    try {
      console.log('Updating carousel settings for content:', editingContent.id, formData);
      const { error } = await supabase
        .from('content')
        .update(formData)
        .eq('id', editingContent.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Configurações do carrossel atualizadas",
      });
      
      setEditingContent(null);
      resetForm();
      await fetchContents(); // Forçar refresh dos dados
    } catch (error) {
      console.error('Error updating carousel settings:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar configurações",
        variant: "destructive",
      });
    }
  };

  const toggleCarouselVisibility = async (content: Content) => {
    try {
      const newVisibility = !content.show_in_carousel;
      console.log('Toggling carousel visibility for:', content.title, 'to:', newVisibility);
      
      const { error } = await supabase
        .from('content')
        .update({ show_in_carousel: newVisibility })
        .eq('id', content.id);

      if (error) throw error;

      // Atualizar estado local imediatamente para feedback visual
      setContents(prevContents => 
        prevContents.map(c => 
          c.id === content.id 
            ? { ...c, show_in_carousel: newVisibility }
            : c
        )
      );

      toast({
        title: "Sucesso",
        description: `Conteúdo ${newVisibility ? 'adicionado ao' : 'removido do'} carrossel`,
      });
    } catch (error) {
      console.error('Error toggling carousel visibility:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar visibilidade no carrossel",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (content: Content) => {
    setEditingContent(content);
    setFormData({
      carousel_image_url: content.carousel_image_url || "",
      carousel_order: content.carousel_order,
      show_in_carousel: content.show_in_carousel
    });
  };

  const resetForm = () => {
    setFormData({
      carousel_image_url: "",
      carousel_order: 0,
      show_in_carousel: false
    });
    setEditingContent(null);
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'vip': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestão do Carrossel</h2>
          <p className="text-muted-foreground">
            Configure quais conteúdos aparecem no carrossel principal
          </p>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Conteúdos do Carrossel</CardTitle>
          <CardDescription>
            Gerencie a exibição e ordem dos conteúdos no carrossel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>No Carrossel</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead>Imagem</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contents.map((content) => (
                <TableRow key={content.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{content.title}</div>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{content.content_type}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPlanBadgeColor(content.required_plan)}>
                      {content.required_plan.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={content.show_in_carousel}
                      onCheckedChange={() => toggleCarouselVisibility(content)}
                    />
                  </TableCell>
                  <TableCell>
                    {content.carousel_order}
                  </TableCell>
                  <TableCell>
                    {content.carousel_image_url ? (
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Configurada</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Não configurada</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(content)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Carousel Settings Dialog */}
      <Dialog open={!!editingContent} onOpenChange={() => {
        setEditingContent(null);
        resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Carrossel</DialogTitle>
            <DialogDescription>
              Configure as opções de exibição no carrossel para: {editingContent?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="carousel_image_url">URL da Imagem (1920x1080)</Label>
              <Input
                id="carousel_image_url"
                value={formData.carousel_image_url}
                onChange={(e) => setFormData({...formData, carousel_image_url: e.target.value})}
                placeholder="https://cdn.site.com/imagem.jpg"
              />
            </div>
            
            <div>
              <Label htmlFor="carousel_order">Ordem no Carrossel</Label>
              <Input
                id="carousel_order"
                type="number"
                value={formData.carousel_order}
                onChange={(e) => setFormData({...formData, carousel_order: parseInt(e.target.value) || 0})}
                placeholder="0"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="show_in_carousel"
                checked={formData.show_in_carousel}
                onCheckedChange={(checked) => setFormData({...formData, show_in_carousel: checked})}
              />
              <Label htmlFor="show_in_carousel">Exibir no Carrossel</Label>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={updateCarouselSettings} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </Button>
              <Button variant="outline" onClick={() => {
                setEditingContent(null);
                resetForm();
              }}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
