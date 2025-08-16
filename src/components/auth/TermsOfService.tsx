import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TermsOfServiceProps {
  onAccept: () => void;
}

const TermsOfService = ({ onAccept }: TermsOfServiceProps) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasReadAll, setHasReadAll] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userIP, setUserIP] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    // Atualizar horário em tempo real
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Obter IP do usuário
    const getUserIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setUserIP(data.ip);
      } catch (error) {
        console.error('Erro ao obter IP:', error);
        setUserIP('IP não disponível');
      }
    };

    getUserIP();

    return () => clearInterval(timer);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight - element.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    
    setScrollProgress(progress);
    
    // Verificar se chegou ao final (95% para considerar tolerância)
    if (progress >= 95 && !hasReadAll) {
      setHasReadAll(true);
    }
  };

  const handleAcceptTerms = async () => {
    setIsAccepting(true);
    
    try {
      const { error } = await supabase
        .from('terms_acceptance')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          ip_address: userIP,
          user_agent: navigator.userAgent,
        });

      if (error) throw error;

      toast({
        title: "Termos aceitos com sucesso!",
        description: "Bem-vindo à nossa plataforma.",
      });

      onAccept();
    } catch (error: any) {
      console.error('Erro ao aceitar termos:', error);
      toast({
        title: "Erro ao aceitar termos",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-alt flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-card border-card-border">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText className="w-8 h-8 text-primary" />
            <CardTitle className="text-3xl font-heading">Termos de Uso</CardTitle>
          </div>
          <p className="text-muted-foreground">
            Por favor, leia atentamente todos os termos antes de aceitar
          </p>
          
          {/* Informações do usuário */}
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>IP:</strong> {userIP}
              </div>
              <div>
                <strong>Data/Hora:</strong> {currentTime.toLocaleString('pt-BR')}
              </div>
              <div className="md:col-span-2">
                <strong>Navegador:</strong> {navigator.userAgent.split(' ')[0]}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Barra de progresso */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Progresso da leitura</span>
              <span className="text-sm font-medium">{Math.round(scrollProgress)}%</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${scrollProgress}%` }}
              />
            </div>
            {scrollProgress >= 95 && (
              <div className="mt-2 text-center">
                <span className="text-success text-sm font-medium">Leitura completa!</span>
              </div>
            )}
          </div>

          {/* Conteúdo dos termos */}
          <div 
            className="h-96 overflow-y-auto border border-border rounded-lg p-6 bg-card text-card-foreground"
            onScroll={handleScroll}
          >
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h2>
                <p className="mb-4">
                  Ao acessar e usar nossa plataforma, você concorda em estar vinculado a estes termos de uso, 
                  todas as leis e regulamentos aplicáveis, e concorda que é responsável pelo cumprimento de 
                  todas as leis locais aplicáveis.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. Uso da Licença</h2>
                <p className="mb-4">
                  É concedida permissão para baixar temporariamente uma cópia dos materiais em nossa plataforma 
                  apenas para visualização transitória pessoal e não comercial. Esta é a concessão de uma licença, 
                  não uma transferência de título.
                </p>
                <p className="mb-4">Sob esta licença, você não pode:</p>
                <ul className="list-disc pl-6 mb-4">
                  <li>modificar ou copiar os materiais;</li>
                  <li>usar os materiais para qualquer finalidade comercial ou para exibição pública;</li>
                  <li>tentar fazer engenharia reversa de qualquer software contido na plataforma;</li>
                  <li>remover quaisquer direitos autorais ou outras notações proprietárias dos materiais.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. Privacidade e Proteção de Dados</h2>
                <p className="mb-4">
                  Respeitamos sua privacidade e nos comprometemos a proteger suas informações pessoais. 
                  Coletamos apenas as informações necessárias para fornecer nossos serviços e não compartilhamos 
                  seus dados com terceiros sem seu consentimento explícito.
                </p>
                <p className="mb-4">
                  As informações coletadas incluem dados de acesso como endereço IP, horário de acesso e 
                  informações do navegador para fins de segurança e melhoria do serviço.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. Responsabilidades do Usuário</h2>
                <p className="mb-4">Como usuário da plataforma, você se compromete a:</p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Usar a plataforma de forma ética e legal;</li>
                  <li>Não compartilhar suas credenciais de acesso;</li>
                  <li>Manter a confidencialidade das informações acessadas;</li>
                  <li>Reportar qualquer uso inadequado ou violação de segurança;</li>
                  <li>Respeitar os direitos de propriedade intelectual.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. Limitações</h2>
                <p className="mb-4">
                  Em nenhum caso nossa empresa ou seus fornecedores serão responsáveis por quaisquer danos 
                  (incluindo, sem limitação, danos por perda de dados ou lucro, ou devido a interrupção dos negócios) 
                  decorrentes do uso ou da incapacidade de usar os materiais em nossa plataforma.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. Precisão dos Materiais</h2>
                <p className="mb-4">
                  Os materiais exibidos em nossa plataforma podem incluir erros técnicos, tipográficos ou fotográficos. 
                  Não garantimos que qualquer material em nossa plataforma seja preciso, completo ou atual.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">7. Links</h2>
                <p className="mb-4">
                  Não analisamos todos os sites vinculados à nossa plataforma e não somos responsáveis pelo 
                  conteúdo de nenhum site vinculado. A inclusão de qualquer link não implica endosso por nossa parte.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">8. Modificações</h2>
                <p className="mb-4">
                  Podemos revisar estes termos de uso a qualquer momento, sem aviso prévio. Ao usar esta plataforma, 
                  você concorda em estar vinculado à versão atual destes termos de uso.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">9. Lei Aplicável</h2>
                <p className="mb-4">
                  Estes termos e condições são regidos e interpretados de acordo com as leis do Brasil, 
                  e você se submete irrevogavelmente à jurisdição exclusiva dos tribunais brasileiros.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">10. Contato</h2>
                <p className="mb-4">
                  Se você tiver alguma dúvida sobre estes Termos de Uso, entre em contato conosco através 
                  dos canais de suporte disponíveis na plataforma.
                </p>
                <p className="mb-8">
                  <strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}
                </p>
              </section>
            </div>
          </div>

          {/* Mensagem de parabéns e botão de aceitar */}
          {hasReadAll && (
            <div className="mt-6 p-6 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-success" />
                <h3 className="text-lg font-semibold text-success">
                  Parabéns! Você leu todo o documento. Agora pode aceitar os termos.
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Você leu todos os termos de uso. Clique no botão abaixo para aceitar e prosseguir com o acesso.
              </p>
              <Button 
                onClick={handleAcceptTerms}
                disabled={isAccepting}
                className="w-full gradient-primary"
                size="lg"
              >
                {isAccepting ? "Processando..." : "✓ Sim, eu aceito"}
              </Button>
            </div>
          )}

          {!hasReadAll && (
            <div className="mt-6 p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                Por favor, role até o final do documento para aceitar os termos de uso.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TermsOfService;