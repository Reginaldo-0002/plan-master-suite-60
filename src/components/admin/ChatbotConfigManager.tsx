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
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          key: 'chatbot_config',
          value: newConfig as any
        });

      if (error) throw error;

      setConfig(newConfig);
      toast({
        title: "Sucesso",
        description: "Configuração do chatbot salva com sucesso",
      });
    } catch (error) {
      console.error('Error saving chatbot config:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configuração do chatbot",
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

    const option: MenuOption = {
      id: Date.now().toString(),
      title: newOption.title.trim(),
      response: newOption.response.trim(),
    };

    const newConfig = {
      ...config,
      menu_options: [...config.menu_options, option]
    };

    await saveConfig(newConfig);
    setNewOption({ title: "", response: "" });
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

    const newConfig = {
      ...config,
      menu_options: config.menu_options.map(opt => 
        opt.id === editingOption.id ? editingOption : opt
      )
    };

    await saveConfig(newConfig);
    setEditingOption(null);
  };

  const removeOption = async (optionId: string) => {
    const newConfig = {
      ...config,
      menu_options: config.menu_options.filter(opt => opt.id !== optionId)
    };

    await saveConfig(newConfig);
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