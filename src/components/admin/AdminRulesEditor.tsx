import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Save, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const AdminRulesEditor = () => {
  const [rulesContent, setRulesContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'site_rules')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.value && typeof data.value === 'object' && 'content' in data.value) {
        setRulesContent(data.value.content as string);
      } else if (data?.value && typeof data.value === 'string') {
        setRulesContent(data.value);
      } else {
        // Default rules content
        setRulesContent(`# Regras da Plataforma

## 1. Termos de Uso

Bem-vindo à nossa plataforma. Ao utilizar nossos serviços, você concorda com as seguintes regras:

### 1.1 Condutas Permitidas
- Uso respeitoso da plataforma
- Compartilhamento de conteúdo apropriado
- Respeito aos outros usuários

### 1.2 Condutas Proibidas
- Spam ou conteúdo não relacionado
- Assédio ou discriminação
- Violação de direitos autorais

## 2. Política de Privacidade

### 2.1 Coleta de Dados
Coletamos apenas os dados necessários para o funcionamento da plataforma.

### 2.2 Uso de Dados
Os dados são utilizados exclusivamente para melhorar sua experiência.

## 3. Sistema de Afiliados

### 3.1 Programa de Indicações
- Ganhe comissões ao indicar novos usuários
- Comissões são creditadas automaticamente
- Saques podem ser solicitados a qualquer momento

### 3.2 Regras de Comissão
- Comissão de 10% sobre vendas de indicados
- Mínimo de R$ 50,00 para saque
- Pagamentos via PIX em até 48h

## 4. Suporte

Para dúvidas ou problemas, entre em contato através do chat de suporte disponível na plataforma.

## 5. Alterações nas Regras

Estas regras podem ser alteradas a qualquer momento. Os usuários serão notificados sobre mudanças importantes.

---

*Última atualização: ${new Date().toLocaleDateString('pt-BR')}*`);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar regras",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveRules = async () => {
    setSaving(true);
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id')
        .eq('key', 'site_rules')
        .single();

      let error;
      if (existing) {
        // Update existing record
        const result = await supabase
          .from('admin_settings')
          .update({ value: { content: rulesContent } })
          .eq('key', 'site_rules');
        error = result.error;
      } else {
        // Insert new record
        const result = await supabase
          .from('admin_settings')
          .insert({ 
            key: 'site_rules',
            value: { content: rulesContent }
          });
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Regras salvas com sucesso",
      });
    } catch (error) {
      console.error('Error saving rules:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar regras",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Editor de Regras</h2>
          <p className="text-muted-foreground">
            Configure as regras e termos da plataforma
          </p>
        </div>
        <Button onClick={saveRules} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Regras"}
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Conteúdo das Regras
          </CardTitle>
          <CardDescription>
            Edite o conteúdo das regras da plataforma usando Markdown. 
            Este conteúdo será exibido na página de regras para todos os usuários.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label htmlFor="rules-content">
              Conteúdo das Regras (Markdown)
            </Label>
            <Textarea
              id="rules-content"
              value={rulesContent}
              onChange={(e) => setRulesContent(e.target.value)}
              placeholder="Digite o conteúdo das regras..."
              rows={25}
              className="font-mono text-sm"
            />
            <div className="text-sm text-muted-foreground">
              <p>Dicas para formatação Markdown:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li># Título Principal</li>
                <li>## Subtítulo</li>
                <li>**Texto em negrito**</li>
                <li>*Texto em itálico*</li>
                <li>- Item de lista</li>
                <li>[Link](URL)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};