import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Zap, Shield } from "lucide-react";

const Index = () => {
  const handleAuth = () => {
    // Placeholder for navigation - replace with your routing logic
    console.log("Navigate to auth page");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Lightning Bolts */}
        <div className="absolute top-20 left-10 w-1 h-32 bg-gradient-to-b from-transparent via-blue-400 to-transparent opacity-30 animate-pulse transform rotate-12"></div>
        <div className="absolute top-40 right-20 w-1 h-24 bg-gradient-to-b from-transparent via-purple-400 to-transparent opacity-40 animate-pulse transform -rotate-45" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-1 h-28 bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-35 animate-pulse transform rotate-45" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-60 right-1/3 w-1 h-20 bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-30 animate-pulse transform -rotate-12" style={{ animationDelay: '1.5s' }}></div>
        
        {/* Floating Orbs */}
        <div className="absolute top-32 left-1/3 w-3 h-3 bg-blue-400 rounded-full opacity-40 animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '3s' }}></div>
        <div className="absolute bottom-40 right-1/4 w-2 h-2 bg-purple-400 rounded-full opacity-50 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '2.5s' }}></div>
        <div className="absolute top-1/2 left-20 w-4 h-4 bg-cyan-400 rounded-full opacity-30 animate-bounce" style={{ animationDelay: '1.2s', animationDuration: '3.5s' }}></div>
        
        {/* Radiating Rays */}
        <div className="absolute top-1/4 right-10">
          <div className="relative">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-32 h-0.5 bg-gradient-to-r from-transparent via-blue-300 to-transparent opacity-20 animate-pulse"
                style={{
                  transform: `rotate(${i * 45}deg)`,
                  transformOrigin: 'left center',
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '2s'
                }}
              ></div>
            ))}
          </div>
        </div>
        
        <div className="absolute bottom-1/4 left-16">
          <div className="relative">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-24 h-0.5 bg-gradient-to-r from-transparent via-purple-300 to-transparent opacity-25 animate-pulse"
                style={{
                  transform: `rotate(${i * 60}deg)`,
                  transformOrigin: 'left center',
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: '2.5s'
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>

      {/* Animated Top Banner */}
      <div className="relative w-full h-12 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 overflow-hidden">
        <div className="flex animate-scroll-infinite">
          <div className="flex-shrink-0 whitespace-nowrap">
            <span className="inline-block text-white font-bold text-lg px-4 py-3 flex items-center">
              <Zap className="w-4 h-4 mr-2" /> COMUNIDADE VITRINE DO DIGITAL
            </span>
          </div>
          <div className="flex-shrink-0 whitespace-nowrap">
            <span className="inline-block text-white font-bold text-lg px-4 py-3 flex items-center">
              <Zap className="w-4 h-4 mr-2" /> COMUNIDADE VITRINE DO DIGITAL
            </span>
          </div>
          <div className="flex-shrink-0 whitespace-nowrap">
            <span className="inline-block text-white font-bold text-lg px-4 py-3 flex items-center">
              <Zap className="w-4 h-4 mr-2" /> COMUNIDADE VITRINE DO DIGITAL
            </span>
          </div>
          <div className="flex-shrink-0 whitespace-nowrap">
            <span className="inline-block text-white font-bold text-lg px-4 py-3 flex items-center">
              <Zap className="w-4 h-4 mr-2" /> COMUNIDADE VITRINE DO DIGITAL
            </span>
          </div>
          <div className="flex-shrink-0 whitespace-nowrap">
            <span className="inline-block text-white font-bold text-lg px-4 py-3 flex items-center">
              <Zap className="w-4 h-4 mr-2" /> COMUNIDADE VITRINE DO DIGITAL
            </span>
          </div>
          <div className="flex-shrink-0 whitespace-nowrap">
            <span className="inline-block text-white font-bold text-lg px-4 py-3 flex items-center">
              <Zap className="w-4 h-4 mr-2" /> COMUNIDADE VITRINE DO DIGITAL
            </span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10"></div>
        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold font-heading text-foreground text-center animate-fade-in">
              Sua Jornada de
              <span className="block text-foreground">
                Sucesso Começa Aqui
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.5s' }}>
              Acesse conteúdo exclusivo, ferramentas poderosas e uma comunidade de alta performance. 
              Transforme seus resultados com nossa plataforma completa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '1s' }}>
              <Button 
                size="lg" 
                className="gradient-primary text-lg px-8 py-3 hover:scale-105 transition-transform duration-300"
                onClick={handleAuth}
              >
                Começar Agora
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-3 hover:scale-105 transition-transform duration-300"
                onClick={handleAuth}
              >
                Já tenho conta
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-background relative">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center space-y-4 animate-fade-in" style={{ animationDelay: '1.5s' }}>
              <div className="w-16 h-16 mx-auto rounded-full gradient-primary flex items-center justify-center hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Comunidade Exclusiva</h3>
              <p className="text-muted-foreground">
                Faça parte de uma comunidade de alta performance com acesso a conteúdo premium.
              </p>
            </div>
            <div className="text-center space-y-4 animate-fade-in" style={{ animationDelay: '2s' }}>
              <div className="w-16 h-16 mx-auto rounded-full gradient-primary flex items-center justify-center hover:scale-110 transition-transform duration-300">
                <Zap className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Ferramentas Avançadas</h3>
              <p className="text-muted-foreground">
                Acelere seus resultados com ferramentas exclusivas e materiais de apoio.
              </p>
            </div>
            <div className="text-center space-y-4 animate-fade-in" style={{ animationDelay: '2.5s' }}>
              <div className="w-16 h-16 mx-auto rounded-full gradient-primary flex items-center justify-center hover:scale-110 transition-transform duration-300">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Segurança Total</h3>
              <p className="text-muted-foreground">
                Seus dados protegidos com a melhor tecnologia de segurança disponível.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-infinite {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        
        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-scroll-infinite {
          animation: scroll-infinite 20s linear infinite;
          display: flex;
          width: 200%;
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default Index;