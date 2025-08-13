import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Zap, Shield } from "lucide-react";

// --- INÍCIO: CSS para as Animações (ATUALIZADO) ---
const AnimationStyles = () => (
  <style>
    {`
      /* Animação da Faixa (Marquee) */
      @keyframes scroll-left {
        from {
          transform: translateX(0);
        }
        to {
          transform: translateX(-100%);
        }
      }

      .animate-scroll-left {
        /* Garante que o bloco de conteúdo não encolha */
        flex-shrink: 0;
        /* Alinha os itens dentro do bloco */
        display: flex;
        align-items: center;
        /* Aplica a animação de rolagem */
        animation: scroll-left 40s linear infinite;
      }

      /* Animação de Raios (Sem alterações) */
      @keyframes lightning-strike {
        0% { opacity: 0; }
        50% { opacity: 0.25; }
        100% { opacity: 0; }
      }
      
      .lightning {
        position: absolute;
        background-color: white;
        animation-name: lightning-strike;
        animation-timing-function: ease-in-out;
        animation-iteration-count: infinite;
      }
      
      .lightning-1 {
        top: 0; left: 10%; width: 2px; height: 100%;
        transform: skewX(-20deg);
        animation-duration: 5s;
        animation-delay: 2s;
      }
      .lightning-2 {
        top: 0; right: 15%; width: 1px; height: 100%;
        transform: skewX(25deg);
        animation-duration: 6s;
        animation-delay: 1s;
      }
      .lightning-3 {
        top: 0; left: 40%; width: 1px; height: 100%;
        transform: skewX(-15deg);
        animation-duration: 4s;
        animation-delay: 4s;
      }
    `}
  </style>
);
// --- FIM: CSS para as Animações ---

// --- INÍCIO: Componente Reutilizável para o Item da Faixa ---
// Isso torna o código mais limpo e fácil de manter.
const MarqueeItem = () => (
    <div className="flex flex-shrink-0 items-center mx-8">
        <Users className="w-6 h-6 mr-3 text-primary"/>
        <span className="whitespace-nowrap text-xl font-semibold text-foreground">
            Comunidade Vitrine Do Digital
        </span>
    </div>
);
// --- FIM: Componente Reutilizável ---


const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background-alt">
      <AnimationStyles />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10"></div>
        
        {/* Efeitos de Raios e Relâmpagos */}
        <div className="absolute inset-0 overflow-hidden">
            <div className="lightning lightning-1"></div>
            <div className="lightning lightning-2"></div>
            <div className="lightning lightning-3"></div>
        </div>
        
        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold font-heading text-foreground text-center">
              Sua Jornada de
              <span className="block text-foreground">Sucesso Começa Aqui</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Acesse conteúdo exclusivo, ferramentas poderosas e uma comunidade
              de alta performance. Transforme seus resultados com nossa
              plataforma completa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="gradient-primary text-lg px-8 py-3"
                onClick={() => navigate("/auth")}
              >
                Começar Agora
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-3"
                onClick={() => navigate("/auth")}
              >
                Já tenho conta
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* --- INÍCIO: Faixa Animada (Marquee) CORRIGIDA --- */}
      <div className="py-4 bg-background-alt flex overflow-hidden">
          {/* Bloco de Conteúdo 1 */}
          <div className="animate-scroll-left">
              <MarqueeItem /><MarqueeItem /><MarqueeItem /><MarqueeItem />
              <MarqueeItem /><MarqueeItem /><MarqueeItem /><MarqueeItem />
          </div>
          {/* Bloco de Conteúdo 2 (cópia exata para o loop contínuo) */}
          <div className="animate-scroll-left" aria-hidden="true">
              <MarqueeItem /><MarqueeItem /><MarqueeItem /><MarqueeItem />
              <MarqueeItem /><MarqueeItem /><MarqueeItem /><MarqueeItem />
          </div>
      </div>
      {/* --- FIM: Faixa Animada (Marquee) --- */}

      {/* Features Section */}
      <div className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full gradient-primary flex items-center justify-center">
                <Users className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Comunidade Exclusiva</h3>
              <p className="text-muted-foreground">
                Faça parte de uma comunidade de alta performance com acesso a
                conteúdo premium.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full gradient-primary flex items-center justify-center">
                <Zap className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Ferramentas Avançadas</h3>
              <p className="text-muted-foreground">
                Acelere seus resultados com ferramentas exclusivas e materiais
                de apoio.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full gradient-primary flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Segurança Total</h3>
              <p className="text-muted-foreground">
                Seus dados protegidos com a melhor tecnologia de segurança
                disponível.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;