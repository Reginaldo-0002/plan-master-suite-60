import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SupabaseWrapper } from "@/lib/supabaseWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, Users, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TermsOfService from "@/components/auth/TermsOfService";
import { useTermsAcceptance } from "@/hooks/useTermsAcceptance";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [purchaseSource, setPurchaseSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAcceptedTerms, loading: termsLoading } = useTermsAcceptance();

  useEffect(() => {
    // Listener otimizado - evita duplicatas no useAuth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Aguarda termos carregarem antes de navegar
      if (session && !termsLoading) {
        if (hasAcceptedTerms) {
          navigate("/dashboard");
        } else {
          setShowTerms(true);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, hasAcceptedTerms, termsLoading]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validação do nome completo
    if (fullName.length < 14) {
      setError("Coloque o nome completo (mínimo 14 caracteres)");
      setLoading(false);
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            whatsapp: whatsapp,
            purchase_source: purchaseSource,
          }
        }
      });

      if (error) throw error;

      if (data.user && !data.session) {
        toast({
          title: "Verifique seu email",
          description: "Enviamos um link de confirmação para seu email.",
        });
      } else if (data.session) {
        toast({
          title: "Conta criada com sucesso!",
          description: "Redirecionando para aceitar os termos de uso.",
        });
        setShowTerms(true);
      }
    } catch (error: any) {
      setError(error.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await SupabaseWrapper.withTimeout(
        () =>
          supabase.auth.signInWithPassword({
            email,
            password,
          }),
        { timeout: 12000, retries: 2, retryDelay: 1200 }
      );

      if (error) throw error;

      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando...",
      });
      navigate("/dashboard");
    } catch (error: any) {
      const raw = error?.message || "Erro ao fazer login";
      if (/(timeout|retries|504|request failed)/i.test(raw)) {
        setError("Instabilidade detectada (504). Tentando novamente...");
        try {
          const { data, error: secondError } = await SupabaseWrapper.withTimeout(
            () =>
              supabase.auth.signInWithPassword({
                email,
                password,
              }),
            { timeout: 16000, retries: 1, retryDelay: 1400 }
          );
          if (secondError) throw secondError;
          toast({ title: "Login realizado com sucesso!", description: "Redirecionando..." });
          navigate("/dashboard");
          return;
        } catch (e2: any) {
          setError(
            "Serviço de autenticação temporariamente indisponível (504). Tente novamente em alguns segundos."
          );
        }
      } else if (/Invalid login credentials/i.test(raw)) {
        setError("Email ou senha inválidos. Verifique e tente novamente.");
      } else {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTermsAccepted = () => {
    setShowTerms(false);
    toast({
      title: "Termos aceitos com sucesso!",
      description: "Bem-vindo à nossa plataforma.",
    });
    navigate("/dashboard");
  };

  // Mostrar tela de termos se necessário
  if (showTerms) {
    return <TermsOfService onAccept={handleTermsAccepted} />;
  }

  return (
    <div className="min-h-screen bg-background-alt flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Hero Section */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold font-heading text-foreground">
              Bem-vindo à nossa
            <span className="block text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
               Vitrine Digital
             </span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Acesse conteúdo exclusivo, ferramentas avançadas e muito mais.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Área de Membros Exclusiva</h3>
                <p className="text-muted-foreground">Acesso a conteúdo premium e comunidade VIP</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Ferramentas Avançadas</h3>
                <p className="text-muted-foreground">Acesso a ferramentas exclusivas para acelerar seus resultados</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Segurança Total</h3>
                <p className="text-muted-foreground">Seus dados protegidos com a melhor tecnologia</p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Forms */}
        <div className="w-full max-w-md mx-auto">
          <Card className="shadow-card border-card-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-heading">Acesse sua conta</CardTitle>
              <CardDescription>
                Entre na sua conta ou crie uma nova para começar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Criar Conta</TabsTrigger>
                </TabsList>

                {error && (
                  <Alert className="mt-4 border-destructive text-destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <TabsContent value="signin" className="space-y-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="********"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full gradient-primary"
                      disabled={loading}
                    >
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Entrar
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nome Completo</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Seu nome completo (mínimo 14 caracteres)"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                      {fullName.length > 0 && fullName.length < 14 && (
                        <p className="text-sm text-destructive">Coloque o nome completo (mínimo 14 caracteres)</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="********"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input
                        id="whatsapp"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purchaseSource">Onde você comprou seu acesso?</Label>
                      <Select value={purchaseSource} onValueChange={setPurchaseSource} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione onde comprou" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
                          <SelectItem value="whatsapp">Pelo WhatsApp</SelectItem>
                          <SelectItem value="kiwify">Kiwify</SelectItem>
                          <SelectItem value="hotmart">Hotmart</SelectItem>
                          <SelectItem value="caktor">Caktor</SelectItem>
                          <SelectItem value="nenhuma">Nenhuma das opções</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full gradient-primary"
                      disabled={loading}
                    >
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Criar Conta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;