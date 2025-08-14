import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Wrench, Loader2, Crown, Gem, Star, Lock, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Tool {
  id: string;
  name: string;
  status: 'active' | 'maintenance' | 'blocked';
  message: string | null;
  url?: string;
  description?: string;
  required_plan?: 'free' | 'vip' | 'pro';
}

interface ToolsSectionProps {
  userPlan: 'free' | 'vip' | 'pro';
}

export const ToolsSection = ({ userPlan }: ToolsSectionProps) => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const planHierarchy = { 'free': 0, 'vip': 1, 'pro': 2 };

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const { data, error } = await supabase
        .from('tool_status')
        .select('*')
        .order('tool_name', { ascending: true });

      if (error) throw error;

      // Map tool_status to our Tool interface
      const mappedTools: Tool[] = (data || []).map(item => ({
        id: item.id,
        name: item.tool_name,
        status: item.status as 'active' | 'maintenance' | 'blocked',
        message: item.message,
        url: `#`, // Default URL - can be configured
        description: `Ferramenta ${item.tool_name}`,
        required_plan: 'free' // Default plan - can be configured per tool
      }));

      setTools(mappedTools);
    } catch (error) {
      console.error('Error fetching tools:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar ferramentas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canAccess = (toolPlan: string) => {
    const userLevel = planHierarchy[userPlan] || 0;
    const requiredLevel = planHierarchy[toolPlan as keyof typeof planHierarchy] || 0;
    return userLevel >= requiredLevel;
  };

  const handleAccessTool = async (tool: Tool) => {
    if (!canAccess(tool.required_plan || 'free') || tool.status !== 'active') {
      return;
    }

    try {
      // Log tool access
      await supabase
        .from('user_interactions')
        .insert([{
          user_id: (await supabase.auth.getUser()).data.user?.id,
          interaction_type: 'tool_access',
          target_type: 'tool',
          target_id: tool.id,
          metadata: { tool_name: tool.name }
        }]);

      // For now, just show a success message
      toast({
        title: "Ferramenta Acessada",
        description: `Acessando ${tool.name}...`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error accessing tool:', error);
      toast({
        title: "Erro",
        description: "Erro ao acessar ferramenta",
        variant: "destructive",
      });
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'pro': return <Crown className="w-4 h-4" />;
      case 'vip': return <Gem className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro': return 'bg-plan-pro text-white';
      case 'vip': return 'bg-plan-vip text-white';
      default: return 'bg-plan-free text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-white';
      case 'maintenance': return 'bg-warning text-white';
      case 'blocked': return 'bg-destructive text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'maintenance': return 'Manutenção';
      case 'blocked': return 'Bloqueado';
      default: return status;
    }
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
        <Wrench className="w-6 h-6" />
        <h1 className="text-3xl font-bold text-foreground">Ferramentas</h1>
        <Badge variant="outline" className="text-primary border-primary">
          {tools.length} Disponíveis
        </Badge>
      </div>

      {tools.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Wrench className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground mb-2">
              Nenhuma ferramenta disponível
            </p>
            <p className="text-muted-foreground">
              As ferramentas serão disponibilizadas em breve pelo administrador.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Card key={tool.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    {tool.name}
                  </CardTitle>
                  <div className="flex flex-col gap-2">
                    <Badge className={getPlanColor(tool.required_plan || 'free')}>
                      {getPlanIcon(tool.required_plan || 'free')}
                      <span className="ml-1 uppercase">{tool.required_plan || 'free'}</span>
                    </Badge>
                    <Badge className={getStatusColor(tool.status)}>
                      {getStatusText(tool.status)}
                    </Badge>
                  </div>
                </div>
                {tool.description && (
                  <CardDescription>{tool.description}</CardDescription>
                )}
                {tool.message && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-foreground">{tool.message}</p>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {tool.status !== 'active' ? (
                  <Button variant="outline" className="w-full" disabled>
                    {getStatusText(tool.status)}
                  </Button>
                ) : !canAccess(tool.required_plan || 'free') ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Lock className="w-4 h-4 mr-2" />
                    Upgrade Necessário
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    onClick={() => handleAccessTool(tool)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Acessar Ferramenta
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};