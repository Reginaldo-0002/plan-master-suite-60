import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Crown, Gem, Star, CheckCircle, Loader2 } from "lucide-react";
import { Profile } from "@/types/profile";

interface PlansSectionProps {
  userPlan: 'free' | 'vip' | 'pro';
  profile: Profile;
}

interface PlatformProduct {
  id: string;
  platform: string;
  product_id: string;
  checkout_url: string | null;
  price_id: string | null;
  plan_id: string;
  active: boolean;
  metadata: any;
}

export const PlansSection = ({ userPlan, profile }: PlansSectionProps) => {
  const [loading, setLoading] = useState(false);
  const [platformProducts, setPlatformProducts] = useState<PlatformProduct[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlatformProducts();
  }, []);

  const fetchPlatformProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_products')
        .select(`
          *,
          plans!inner(*)
        `)
        .eq('active', true);

      if (error) throw error;
      setPlatformProducts(data || []);
    } catch (error) {
      console.error('Error fetching platform products:', error);
    }
  };

  const handleUpgrade = async (planSlug: 'vip' | 'pro') => {
    setLoading(true);
    try {
      // Buscar produto da plataforma para o plano
      const product = platformProducts.find(p => 
        p.plans?.slug === planSlug && p.active
      );

      if (!product) {
        toast({
          title: "Produto não encontrado",
          description: "Não foi possível encontrar um produto ativo para este plano.",
          variant: "destructive"
        });
        return;
      }

      // Se tem checkout_url direto, redirecionar
      if (product.checkout_url) {
        window.open(product.checkout_url, '_blank');
        return;
      }

      // Caso contrário, tentar gerar URL de checkout via webhook
      toast({
        title: "Redirecionando...",
        description: "Redirecionando para a página de pagamento."
      });

      // Aqui você pode implementar lógica adicional para gerar checkout
      // via webhook se necessário
      
    } catch (error) {
      console.error('Error upgrading plan:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar upgrade. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 'R$ 0',
      description: 'Perfeito para começar',
      icon: <Star className="w-6 h-6" />,
      color: 'bg-plan-free',
      features: [
        'Acesso básico ao conteúdo',
        'Suporte por email',
        'Tutoriais essenciais',
        'Dashboard básico'
      ],
      current: userPlan === 'free'
    },
    {
      id: 'vip',
      name: 'VIP',
      price: 'R$ 97',
      description: 'Para usuários avançados',
      icon: <Gem className="w-6 h-6" />,
      color: 'bg-plan-vip',
      features: [
        'Tudo do plano Free',
        'Acesso a conteúdo premium',
        'Suporte prioritário',
        'Ferramentas avançadas',
        'Webinars exclusivos',
        'Comunidade VIP'
      ],
      current: userPlan === 'vip'
    },
    {
      id: 'pro',
      name: 'PRO',
      price: 'R$ 197',
      description: 'Para profissionais sérios',
      icon: <Crown className="w-6 h-6" />,
      color: 'bg-plan-pro',
      features: [
        'Tudo do plano VIP',
        'Acesso ilimitado a tudo',
        'Suporte 24/7',
        'Consultoria individual',
        'Recursos beta',
        'Certificações',
        'Mentorias ao vivo'
      ],
      current: userPlan === 'pro'
    }
  ];

  const getPlanEndDate = () => {
    if (profile.plan_end_date) {
      return new Date(profile.plan_end_date).toLocaleDateString('pt-BR');
    }
    return null;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold gradient-text">Escolha seu Plano</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Selecione o plano que melhor se adapta às suas necessidades e acelere seu crescimento
        </p>
        
        {userPlan !== 'free' && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="font-medium text-success">
                Plano {userPlan.toUpperCase()} ativo
              </span>
            </div>
            {getPlanEndDate() && (
              <p className="text-sm text-muted-foreground mt-1">
                Válido até: {getPlanEndDate()}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative border-2 transition-all duration-300 hover:scale-105 ${
              plan.current 
                ? 'border-primary shadow-lg shadow-primary/20' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            {plan.current && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 gradient-primary">
                Plano Atual
              </Badge>
            )}
            
            <CardHeader className="text-center space-y-4">
              <div className={`w-16 h-16 rounded-full ${plan.color} flex items-center justify-center mx-auto text-white`}>
                {plan.icon}
              </div>
              
              <div>
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="mt-2">{plan.description}</CardDescription>
              </div>
              
              <div className="text-3xl font-bold gradient-text">
                {plan.price}
                {plan.id !== 'free' && <span className="text-sm text-muted-foreground">/mês</span>}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-4">
                {plan.current ? (
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    disabled
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Plano Ativo
                  </Button>
                ) : plan.id === 'free' ? (
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    disabled
                  >
                    Plano Atual
                  </Button>
                ) : (
                  <Button 
                    className="w-full gradient-primary" 
                    onClick={() => handleUpgrade(plan.id as 'vip' | 'pro')}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        Assinar {plan.name}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-card/50 border border-border rounded-lg p-6 max-w-4xl mx-auto">
        <h3 className="text-xl font-semibold mb-4 text-center">Perguntas Frequentes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Como funciona o pagamento?</h4>
            <p className="text-sm text-muted-foreground">
              O pagamento é processado de forma segura através de nossas plataformas parceiras. 
              Você será redirecionado para finalizar a compra.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Posso cancelar a qualquer momento?</h4>
            <p className="text-sm text-muted-foreground">
              Sim, você pode cancelar sua assinatura a qualquer momento através do painel 
              de controle ou entrando em contato com nosso suporte.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">O que acontece após o vencimento?</h4>
            <p className="text-sm text-muted-foreground">
              Caso não haja renovação, sua conta voltará automaticamente para o plano Free, 
              mantendo seus dados salvos.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Há garantia de reembolso?</h4>
            <p className="text-sm text-muted-foreground">
              Oferecemos garantia de 7 dias para todos os planos pagos. Entre em contato 
              com nosso suporte se não estiver satisfeito.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};