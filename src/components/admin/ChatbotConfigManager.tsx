import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, Trash2, Edit } from "lucide-react";

interface MenuOption {
  id: string;
  title: string;
  response: string;
}

interface ChatbotConfig {
  menu_options: MenuOption[];
}

export const ChatbotConfigManager = () => {
  const [config, setConfig] = useState<ChatbotConfig>({ menu_options: [] });
  const [newOption, setNewOption] = useState({ title: "", response: "" });
  const [editingOption, setEditingOption] = useState<MenuOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchChatbotConfig();
  }, []);

  const fetchChatbotConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'chatbot_config')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.value) {
        const configValue = data.value as any;
        if (configValue && typeof configValue === 'object' && configValue.menu_options) {
          setConfig(configValue as ChatbotConfig);
        }
      }
    } catch (error) {
      console.error('Error fetching chatbot config:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar configuração do chatbot",
        variant: "destructive",
      });
    }
  };

  const saveConfig = async (newConfig: ChatbotConfig) => {
    setIsLoading(true);
    try {
      console.log('Saving chatbot config:', newConfig);
      
      // CORREÇÃO DEFINITIVA: Sempre usar UPDATE pois sabemos que o registro já existe
      // A tabela admin_settings funciona como chave-valor, não deve haver INSERT duplicado
      const { data, error } = await supabase
        .from('admin_settings')
        .update({
          value: newConfig as any,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'chatbot_config')
        .select();

      console.log('Update operation result:', { data, error });

      if (error) {
        console.error('Database operation error:', error);
        throw error;
      }

      // Se não atualizou nenhuma linha, significa que não existe o registro
      if (!data || data.length === 0) {
        console.log('No record found, creating new one');
        const { data: insertData, error: insertError } = await supabase
          .from('admin_settings')
          .insert({
            key: 'chatbot_config',
            value: newConfig as any
          })
          .select();

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
        console.log('Record created:', insertData);
      }

      // Atualizar estado local
      setConfig(newConfig);
      console.log('Config updated successfully in state');
      
      toast({
        title: "Sucesso",
        description: "Configuração do chatbot salva com sucesso",
      });
      
    } catch (error: any) {
      console.error('Error saving chatbot config:', error);
      toast({
        title: "Erro",
        description: `Falha ao salvar: ${error?.message || 'Erro desconhecido'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addOption = async () => {
    if (!newOption.title.trim() || !newOption.response.trim()) {
      toast({
        title: "Erro",
        description: "Título e resposta são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Adding chatbot option:', newOption);
      
      const option: MenuOption = {
        id: Date.now().toString(),
        title: newOption.title.trim(),
        response: newOption.response.trim(),
      };

      const newConfig = {
        ...config,
        menu_options: [...config.menu_options, option]
      };

      console.log('New config to save:', newConfig);
      await saveConfig(newConfig);
      setNewOption({ title: "", response: "" });
      
      console.log('Chatbot option added successfully');
    } catch (error) {
      console.error('Error adding chatbot option:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar opção do chatbot",
        variant: "destructive",
      });
    }
  };

  const updateOption = async () => {
    if (!editingOption || !editingOption.title.trim() || !editingOption.response.trim()) {
      toast({
        title: "Erro",
        description: "Título e resposta são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Updating chatbot option:', editingOption);
      
      const newConfig = {
        ...config,
        menu_options: config.menu_options.map(opt => 
          opt.id === editingOption.id ? editingOption : opt
        )
      };

      console.log('Updated config to save:', newConfig);
      await saveConfig(newConfig);
      setEditingOption(null);
      
      console.log('Chatbot option updated successfully');
    } catch (error) {
      console.error('Error updating chatbot option:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar opção do chatbot",
        variant: "destructive",
      });
    }
  };

  const removeOption = async (optionId: string) => {
    try {
      console.log('Removing chatbot option with ID:', optionId);
      console.log('Current config:', config);
      
      const newConfig = {
        ...config,
        menu_options: config.menu_options.filter(opt => opt.id !== optionId)
      };

      console.log('New config after removal:', newConfig);
      await saveConfig(newConfig);
      
      console.log('Chatbot option removed successfully');
      toast({
        title: "Sucesso",
        description: "Opção removida com sucesso",
      });
    } catch (error) {
      console.error('Error removing chatbot option:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover opção do chatbot",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Configuração do Chatbot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Option */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-medium">Adicionar Nova Opção</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="option-title">Título da Opção</Label>
                <Input
                  id="option-title"
                  value={newOption.title}
                  onChange={(e) => setNewOption({ ...newOption, title: e.target.value })}
                  placeholder="Ex: Problemas com Pagamento"
                />
              </div>
              <div>
                <Label htmlFor="option-response">Resposta</Label>
                <Textarea
                  id="option-response"
                  value={newOption.response}
                  onChange={(e) => setNewOption({ ...newOption, response: e.target.value })}
                  placeholder="Resposta que o chatbot dará quando esta opção for selecionada..."
                  rows={3}
                />
              </div>
              <Button onClick={addOption} disabled={isLoading} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Opção
              </Button>
            </div>
          </div>

          {/* Current Options */}
          <div className="space-y-4">
            <h3 className="font-medium">Opções Configuradas ({config.menu_options.length})</h3>
            {config.menu_options.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma opção configurada ainda
              </p>
            ) : (
              <div className="space-y-3">
                {config.menu_options.map((option) => (
                  <div key={option.id} className="p-4 border rounded-lg">
                    {editingOption?.id === option.id ? (
                      <div className="space-y-3">
                        <Input
                          value={editingOption.title}
                          onChange={(e) => setEditingOption({ ...editingOption, title: e.target.value })}
                          placeholder="Título da opção"
                        />
                        <Textarea
                          value={editingOption.response}
                          onChange={(e) => setEditingOption({ ...editingOption, response: e.target.value })}
                          placeholder="Resposta do chatbot"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button onClick={updateOption} size="sm" disabled={isLoading}>
                            Salvar
                          </Button>
                          <Button onClick={() => setEditingOption(null)} variant="outline" size="sm">
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">{option.title}</Badge>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setEditingOption(option)}
                              variant="outline"
                              size="sm"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => removeOption(option.id)}
                              variant="destructive"
                              size="sm"
                              disabled={isLoading}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{option.response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};