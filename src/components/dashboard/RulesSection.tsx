import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOptimizedQueries } from "@/hooks/useOptimizedQueries";

export const RulesSection = () => {
  const [rulesContent, setRulesContent] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { optimizedRulesFetch } = useOptimizedQueries();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const data = await optimizedRulesFetch();

      if (data && 'value' in data && data.value) {
        const value = data.value as any;
        if (typeof value === 'object' && 'content' in value) {
          setRulesContent(value.content as string);
        } else if (typeof value === 'string') {
          setRulesContent(value);
        } else {
          setRulesContent(defaultRulesContent);
        }
      } else {
        setRulesContent(defaultRulesContent);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
      setRulesContent(defaultRulesContent);
    } finally {
      setLoading(false);
    }
  };

  const defaultRulesContent = useMemo(() => `# Regras da Plataforma

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

*Última atualização: ${new Date().toLocaleDateString('pt-BR')}*`, []);

  const formatMarkdown = (content: string) => {
    return content
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4 text-primary">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mb-3 text-foreground">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-medium mb-2 text-foreground">$1</h3>')
      .replace(/^\- (.*$)/gim, '<li class="mb-1 text-foreground">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-muted-foreground">$1</em>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6" />
        <h1 className="text-3xl font-bold text-foreground">Regras da Plataforma</h1>
        <Badge variant="outline" className="text-success border-success">
          Atualizado
        </Badge>
      </div>

      <Card className="border-border">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FileText className="w-5 h-5" />
            Termos de Uso e Regras
          </CardTitle>
          <CardDescription>
            Leia atentamente as regras e termos de uso da plataforma. 
            Ao utilizar nossos serviços, você concorda com estas diretrizes.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div 
            className="prose prose-slate max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ 
              __html: formatMarkdown(rulesContent) 
            }} 
          />
        </CardContent>
      </Card>
    </div>
  );
};