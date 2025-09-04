import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Copy, Link, Share2, Info } from 'lucide-react';
import { Profile } from '@/types/profile';

interface ReferralLinkGeneratorProps {
  profile: Profile;
}

export const ReferralLinkGenerator = ({ profile }: ReferralLinkGeneratorProps) => {
  const { toast } = useToast();
  const [baseUrl] = useState(window.location.origin);

  // Gerar diferentes tipos de links
  const referralLinks = {
    dashboard: `${baseUrl}/dashboard?ref=${profile.referral_code}`,
    plans: `${baseUrl}/dashboard?ref=${profile.referral_code}#plans`,
    home: `${baseUrl}/?ref=${profile.referral_code}`,
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Link copiado!",
        description: `Link de ${type} copiado para a área de transferência.`,
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link. Tente novamente.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const shareLink = async (link: string, type: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Indicação - ${type}`,
          text: `Você foi indicado! Use meu código ${profile.referral_code} e ganhe acesso exclusivo.`,
          url: link,
        });
      } catch (error) {
        // Fallback para copiar se o share falhar
        copyToClipboard(link, type);
      }
    } else {
      copyToClipboard(link, type);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Link className="w-5 h-5" />
          Gerador de Links de Indicação
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Crie links personalizados para compartilhar com seus indicados
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Link para Dashboard */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Link para Dashboard:</label>
          <div className="flex gap-2">
            <Input
              value={referralLinks.dashboard}
              readOnly
              className="font-mono text-xs bg-background/50"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(referralLinks.dashboard, 'Dashboard')}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => shareLink(referralLinks.dashboard, 'Dashboard')}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Link para Planos */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Link Direto para Planos:</label>
          <div className="flex gap-2">
            <Input
              value={referralLinks.plans}
              readOnly
              className="font-mono text-xs bg-background/50"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(referralLinks.plans, 'Planos')}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => shareLink(referralLinks.plans, 'Planos')}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Link para Home */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Link para Página Inicial:</label>
          <div className="flex gap-2">
            <Input
              value={referralLinks.home}
              readOnly
              className="font-mono text-xs bg-background/50"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(referralLinks.home, 'Página Inicial')}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => shareLink(referralLinks.home, 'Página Inicial')}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Instruções */}
        <div className="bg-info/10 border border-info/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-info mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-info">Como funciona:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Compartilhe qualquer um dos links acima com seus indicados</li>
                <li>• Quando eles acessarem pelo seu link, seu código será automaticamente capturado</li>
                <li>• Ao fazerem uma compra, você ganha comissão automaticamente</li>
                <li>• As comissões são calculadas pelas configurações do admin</li>
                <li>• Você pode acompanhar seus ganhos em tempo real no dashboard</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{profile.referral_code}</p>
            <p className="text-xs text-muted-foreground">Seu Código</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-secondary">R$ {profile.referral_earnings.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Ganho</p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};