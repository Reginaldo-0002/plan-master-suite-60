import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Crown, Gem, Star, CheckCircle, Loader2 } from "lucide-react";
import { Profile } from "@/types/profile";
import { useAreaTracking } from "@/hooks/useAreaTracking";

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
  plans?: {
    id: string;
    name: string;
    slug: string;
    price_cents: number;
    active: boolean;
  };
}

export const PlansSection = ({ userPlan, profile }: PlansSectionProps) => {
  const [loading, setLoading] = useState(false);
  const [platformProducts, setPlatformProducts] = useState<PlatformProduct[]>([]);
  const [plansFromDB, setPlansFromDB] = useState<any[]>([]);
  const { toast } = useToast();
  const { trackAreaAccess } = useAreaTracking();

  // Remove any admin-only restrictions for viewing plans
  // All users should be able to see and interact with plans

  useEffect(() => {
    fetchPlatformProducts();
    fetchPlans();
    trackAreaAccess('Plans');
  }, [trackAreaAccess]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('price_cents', { ascending: true });

      if (error) throw error;
      setPlansFromDB(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

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
      console.log('🚀 Starting upgrade process for plan:', planSlug);

      // First fetch available platforms from the database
      const { data: platformData, error: platformError } = await supabase
        .from('platform_products')
        .select(`
          platform,
          product_id,
          checkout_url,
          plans!inner(slug, name)
        `)
        .eq('plans.slug', planSlug)
        .eq('active', true)
        .limit(1);

      if (platformError || !platformData?.length) {
        console.error('❌ Platform error:', platformError);
        throw new Error('Plataforma de pagamento não configurada para este plano');
      }

      const platform = platformData[0].platform;
      console.log('📋 Using platform:', platform);

      // Call edge function to create checkout
      const { data, error } = await supabase.functions.invoke('platform-checkout', {
        body: {
          platform: platform,
          plan_slug: planSlug
        }
      });

      if (error) {
        console.error('❌ Function error:', error);
        throw error;
      }

      console.log('✅ Function response:', data);

      if (data?.success && data.checkout_url) {
        console.log('🔗 Opening checkout:', data.checkout_url);
        
        // Show success message before redirect
        toast({
          title: "Redirecionando para Checkout",
          description: `Abrindo página de pagamento para o plano ${planSlug.toUpperCase()} - ${data.plan_name}`,
          variant: "default",
        });

        // Open checkout in new tab
        window.open(data.checkout_url, '_blank');
      } else {
        throw new Error(data?.error || 'Falha ao gerar checkout');
      }
      
    } catch (error) {
      console.error('❌ Upgrade error:', error);
      toast({
        title: "Erro no Upgrade",
        description: error.message || "Erro ao processar upgrade. Verifique sua conexão e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlansData = () => {
    // Base plan structure
    const planStructure = {
      free: {
        name: 'Free',
        description: 'Perfeito para começar',
        icon: <Star className="w-6 h-6" />,
        color: 'bg-plan-free',
        features: [
          'Acesso básico ao conteúdo',
          'Suporte por email',
          'Tutoriais essenciais',
          'Dashboard básico'
        ]
      },
      vip: {
        name: 'VIP',
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
        ]
      },
      pro: {
        name: 'PRO',
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
        ]
      }
    };

    // Create plans array with prices from database
    const plans = [];
    
    // Add predefined plan order
    const planOrder = ['free', 'vip', 'pro'];
    
    planOrder.forEach(slug => {
      const dbPlan = plansFromDB.find(p => p.slug === slug);
      const structure = planStructure[slug as keyof typeof planStructure];
      
      if (structure) {
        const price = dbPlan 
          ? `R$ ${(dbPlan.price_cents / 100).toFixed(2).replace('.', ',')}` 
          : (slug === 'free' ? 'R$ 0' : 'R$ 0');
          
        plans.push({
          id: slug,
          name: structure.name,
          price,
          description: structure.description,
          icon: structure.icon,
          color: structure.color,
          features: structure.features,
          current: userPlan === slug
        });
      }
    });

    return plans;
  };

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
        {getPlansData().map((plan) => (
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