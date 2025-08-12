import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, Trash2, Edit, Save } from "lucide-react";

interface MenuOption {
  id: string;
  title: string;
  response: string;
}

interface ChatbotConfig {
  menu_options: MenuOption[];
}

const CHATBOT_CONFIG_KEY = 'chatbot_config';
const RECORD_ID = '58b4980a-cb38-4468-a7d3-d741baff4c14'; // ID fixo do registro existente

export const ChatbotConfigManager = () => {
  const [config, setConfig] = useState<ChatbotConfig>({ menu_options: [] });
  const [newOption, setNewOption] = useState({ title: "", response: "" });
  const [editingOption, setEditingOption] = useState<MenuOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadChatbotConfig();
  }, []);

  // Função para carregar a configuração
  const loadChatbotConfig = async () => {
    try {
      console.log('🔄 Carregando configuração do chatbot...');
      
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('id', RECORD_ID)
        .single();

      if (error) {
        console.error('❌ Erro ao carregar:', error);
        throw error;
      }

      if (data?.value) {
        const configValue = data.value as any;
        if (configValue && typeof configValue === 'object' && configValue.menu_options) {
          setConfig(configValue as ChatbotConfig);
          console.log('✅ Configuração carregada:', configValue);
        }
      }
    } catch (error: any) {
      console.error('❌ Erro na loadChatbotConfig:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar configuração do chatbot",
        variant: "destructive",
      });
    }
  };

  // Função para salvar DIRETAMENTE no banco usando UPDATE
  const saveConfigToDatabase = async (configToSave: ChatbotConfig) => {
    try {
      console.log('💾 Salvando no banco:', configToSave);
      
      const { data, error } = await supabase
        .from('admin_settings')
        .update({ 
          value: configToSave as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', RECORD_ID)
        .select();

      if (error) {
        console.error('❌ Erro no UPDATE:', error);
        throw error;
      }

      console.log('✅ Salvo com sucesso:', data);
      return data;
    } catch (error) {
      console.error('❌ Erro em saveConfigToDatabase:', error);
      throw error;
    }
  };

  // Adicionar nova opção
  const addOption = () => {
    if (!newOption.title.trim() || !newOption.response.trim()) {
      toast({
        title: "Erro",
        description: "Título e resposta são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const option: MenuOption = {
      id: `option_${Date.now()}`,
      title: newOption.title.trim(),
      response: newOption.response.trim(),
    };

    const newConfig = {
      ...config,
      menu_options: [...config.menu_options, option]
    };

    setConfig(newConfig);
    setNewOption({ title: "", response: "" });
    setHasChanges(true);
    
    console.log('➕ Opção adicionada localmente:', option);
    toast({
      title: "Sucesso",
      description: "Opção adicionada. Clique em 'Salvar Todas as Mudanças' para confirmar.",
    });
  };

  // Remover opção
  const removeOption = (optionId: string) => {
    const newConfig = {
      ...config,
      menu_options: config.menu_options.filter(opt => opt.id !== optionId)
    };

    setConfig(newConfig);
    setHasChanges(true);
    
    console.log('🗑️ Opção removida localmente:', optionId);
    toast({
      title: "Sucesso", 
      description: "Opção removida. Clique em 'Salvar Todas as Mudanças' para confirmar.",
    });
  };

  // Atualizar opção
  const updateOption = () => {
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

    setConfig(newConfig);
    setEditingOption(null);
    setHasChanges(true);
    
    console.log('✏️ Opção editada localmente:', editingOption);
    toast({
      title: "Sucesso",
      description: "Opção editada. Clique em 'Salvar Todas as Mudanças' para confirmar.",
    });
  };

  // Salvar todas as mudanças no banco
  const saveAllChanges = async () => {
    setIsLoading(true);
    try {
      await saveConfigToDatabase(config);
      setHasChanges(false);
      
      toast({
        title: "Sucesso",
        description: "Todas as configurações foram salvas no banco de dados!",
      });
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: `Falha ao salvar: ${error?.message || 'Erro desconhecido'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Descartar mudanças
  const discardChanges = () => {
    loadChatbotConfig();
    setHasChanges(false);
    setEditingOption(null);
    setNewOption({ title: "", response: "" });
    
    toast({
      title: "Mudanças descartadas",
      description: "Configuração revertida para a última versão salva.",
    });
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
          
          {/* Barra de Ações */}
          {hasChanges && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-yellow-800">
                  Você tem mudanças não salvas. Salve para aplicar no banco de dados.
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={saveAllChanges} 
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Todas as Mudanças
                  </Button>
                  <Button 
                    onClick={discardChanges} 
                    variant="outline" 
                    size="sm"
                  >
                    Descartar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Adicionar Nova Opção */}
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
              <Button onClick={addOption} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Opção (Local)
              </Button>
            </div>
          </div>

          {/* Opções Configuradas */}
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
                          <Button onClick={updateOption} size="sm">
                            Confirmar Edição
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