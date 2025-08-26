import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Bot, Eye, BarChart, ExternalLink } from 'lucide-react';

interface ChatbotResponse {
  id: string;
  trigger_text: string;
  response_type: string;
  title?: string;
  message: string;
  rich_content: any;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface ButtonConfig {
  text: string;
  value?: string;
  url?: string;
  variant?: string;
}

export const AdvancedChatbotManager = () => {
  const [responses, setResponses] = useState<ChatbotResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<ChatbotResponse | null>(null);
  const [formData, setFormData] = useState({
    trigger_text: '',
    response_type: 'text',
    title: '',
    message: '',
    priority: 5,
    is_active: true,
    buttons: [] as ButtonConfig[],
    image_url: '',
    image_alt: '',
    card_items: [] as any[]
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_rich_responses')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error('Error fetching responses:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar respostas do chatbot',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      trigger_text: '',
      response_type: 'text',
      title: '',
      message: '',
      priority: 5,
      is_active: true,
      buttons: [],
      image_url: '',
      image_alt: '',
      card_items: []
    });
    setEditingResponse(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (response: ChatbotResponse) => {
    setEditingResponse(response);
    
    // Parse existing rich content
    const richContent = response.rich_content || {};
    
    setFormData({
      trigger_text: response.trigger_text,
      response_type: response.response_type,
      title: response.title || '',
      message: response.message,
      priority: response.priority,
      is_active: response.is_active,
      buttons: richContent.buttons || [],
      image_url: richContent.image?.url || '',
      image_alt: richContent.image?.alt || '',
      card_items: richContent.items || []
    });
    
    setIsDialogOpen(true);
  };

  const buildRichContent = () => {
    const richContent: any = {};
    
    if (formData.response_type === 'buttons' && formData.buttons.length > 0) {
      richContent.buttons = formData.buttons;
    }
    
    if (formData.response_type === 'image' && formData.image_url) {
      richContent.image = {
        url: formData.image_url,
        alt: formData.image_alt || 'Imagem'
      };
      if (formData.buttons.length > 0) {
        richContent.buttons = formData.buttons;
      }
    }
    
    if (formData.response_type === 'card' && formData.card_items.length > 0) {
      richContent.items = formData.card_items;
    }
    
    return richContent;
  };

  const handleSave = async () => {
    try {
      const richContent = buildRichContent();
      
      const responseData = {
        trigger_text: formData.trigger_text.toLowerCase(),
        response_type: formData.response_type,
        title: formData.title || null,
        message: formData.message,
        rich_content: richContent,
        priority: formData.priority,
        is_active: formData.is_active
      };

      if (editingResponse) {
        const { error } = await supabase
          .from('chatbot_rich_responses')
          .update(responseData)
          .eq('id', editingResponse.id);
        
        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Resposta atualizada com sucesso'
        });
      } else {
        const { error } = await supabase
          .from('chatbot_rich_responses')
          .insert([responseData]);
        
        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Resposta criada com sucesso'
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchResponses();
    } catch (error) {
      console.error('Error saving response:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar resposta',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta resposta? Esta ação não pode ser desfeita.')) return;
    
    try {
      console.log('Tentando deletar resposta com ID:', id);
      
      const { error } = await supabase
        .from('chatbot_rich_responses')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Erro no Supabase:', error);
        throw error;
      }
      
      console.log('Resposta deletada com sucesso');
      
      toast({
        title: 'Sucesso',
        description: 'Resposta excluída com sucesso'
      });
      
      // Atualizar a lista imediatamente
      await fetchResponses();
    } catch (error) {
      console.error('Error deleting response:', error);
      toast({
        title: 'Erro',
        description: `Erro ao excluir resposta: ${error.message || 'Erro desconhecido'}`,
        variant: 'destructive'
      });
    }
  };

  const addButton = () => {
    setFormData(prev => ({
      ...prev,
      buttons: [...prev.buttons, { text: '', value: '', variant: 'outline' }]
    }));
  };

  const updateButton = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons.map((btn, i) => 
        i === index ? { ...btn, [field]: value } : btn
      )
    }));
  };

  const removeButton = (index: number) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index)
    }));
  };

  const addCardItem = () => {
    setFormData(prev => ({
      ...prev,
      card_items: [...prev.card_items, {
        title: '',
        description: '',
        button: { text: '', url: '' }
      }]
    }));
  };

  const updateCardItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      card_items: prev.card_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeCardItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      card_items: prev.card_items.filter((_, i) => i !== index)
    }));
  };

  const getTypeBadge = (type: string) => {
    const badges = {
      text: { label: 'Texto', variant: 'default' as const },
      buttons: { label: 'Botões', variant: 'secondary' as const },
      image: { label: 'Imagem', variant: 'outline' as const },
      card: { label: 'Cards', variant: 'destructive' as const }
    };
    
    const badge = badges[type as keyof typeof badges] || badges.text;
    
    return (
      <Badge variant={badge.variant}>
        {badge.label}
      </Badge>
    );
  };

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Chatbot Inteligente
          </h2>
          <p className="text-muted-foreground">
            Configure respostas automáticas com botões, imagens e cards
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Resposta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Respostas Configuradas ({responses.length})
          </CardTitle>
          <CardDescription>
            Gerencie as respostas automáticas do chatbot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gatilho</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response) => (
                <TableRow key={response.id}>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-sm">
                      {response.trigger_text}
                    </code>
                  </TableCell>
                  <TableCell>{getTypeBadge(response.response_type)}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {response.title || 'Sem título'}
                      </div>
                      <div className="text-sm text-muted-foreground truncate max-w-xs">
                        {response.message}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{response.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={response.is_active ? 'default' : 'secondary'}>
                      {response.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(response)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(response.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para criar/editar respostas */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingResponse ? 'Editar Resposta' : 'Nova Resposta'}
            </DialogTitle>
            <DialogDescription>
              Configure uma resposta automática para o chatbot
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Configurações básicas */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="trigger">Texto Gatilho</Label>
                <Input
                  id="trigger"
                  value={formData.trigger_text}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    trigger_text: e.target.value
                  }))}
                  placeholder="ola, ajuda, conta..."
                />
              </div>

              <div>
                <Label htmlFor="type">Tipo de Resposta</Label>
                <Select
                  value={formData.response_type}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    response_type: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto Simples</SelectItem>
                    <SelectItem value="buttons">Com Botões</SelectItem>
                    <SelectItem value="image">Com Imagem</SelectItem>
                    <SelectItem value="card">Cards</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Título (opcional)</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    title: e.target.value
                  }))}
                  placeholder="Título da mensagem..."
                />
              </div>

              <div>
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    message: e.target.value
                  }))}
                  placeholder="Mensagem do bot..."
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-4">
                <div>
                  <Label htmlFor="priority">Prioridade</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      priority: parseInt(e.target.value) || 5
                    }))}
                    className="w-20"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      is_active: checked
                    }))}
                  />
                  <Label htmlFor="active">Ativo</Label>
                </div>
              </div>
            </div>

            {/* Configurações específicas do tipo */}
            <div className="space-y-4">
              {(formData.response_type === 'buttons' || formData.response_type === 'image') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Botões</Label>
                    <Button type="button" size="sm" onClick={addButton}>
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {formData.buttons.map((button, index) => (
                      <div key={index} className="flex gap-2 p-2 border rounded">
                        <Input
                          placeholder="Texto do botão"
                          value={button.text}
                          onChange={(e) => updateButton(index, 'text', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Valor/URL"
                          value={button.value || button.url || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.startsWith('http')) {
                              updateButton(index, 'url', value);
                              updateButton(index, 'value', '');
                            } else {
                              updateButton(index, 'value', value);
                              updateButton(index, 'url', '');
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeButton(index)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.response_type === 'image' && (
                <div className="space-y-2">
                  <Label>Configuração da Imagem</Label>
                  <Input
                    placeholder="URL da imagem"
                    value={formData.image_url}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      image_url: e.target.value
                    }))}
                  />
                  <Input
                    placeholder="Texto alternativo"
                    value={formData.image_alt}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      image_alt: e.target.value
                    }))}
                  />
                </div>
              )}

              {formData.response_type === 'card' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Items do Card</Label>
                    <Button type="button" size="sm" onClick={addCardItem}>
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {formData.card_items.map((item, index) => (
                      <div key={index} className="p-3 border rounded space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs">Item {index + 1}</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCardItem(index)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Título"
                          value={item.title}
                          onChange={(e) => updateCardItem(index, 'title', e.target.value)}
                        />
                        <Input
                          placeholder="Descrição"
                          value={item.description}
                          onChange={(e) => updateCardItem(index, 'description', e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Texto do botão"
                            value={item.button?.text || ''}
                            onChange={(e) => updateCardItem(index, 'button', {
                              ...item.button,
                              text: e.target.value
                            })}
                          />
                          <Input
                            placeholder="URL"
                            value={item.button?.url || ''}
                            onChange={(e) => updateCardItem(index, 'button', {
                              ...item.button,
                              url: e.target.value
                            })}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingResponse ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};