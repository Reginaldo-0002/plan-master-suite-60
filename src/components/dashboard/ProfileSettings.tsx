
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AvatarUpload } from "@/components/media/AvatarUpload";
import { Copy, Loader2 } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'vip' | 'pro';
  pix_key: string | null;
  total_session_time: number;
  areas_accessed: number;
  referral_code: string;
  referral_earnings: number;
  created_at: string;
  updated_at: string;
}

interface ProfileSettingsProps {
  profile: Profile;
  onProfileUpdate: (updatedProfile: Profile) => void;
}

export const ProfileSettings = ({ profile, onProfileUpdate }: ProfileSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile.full_name || "",
    pix_key: profile.pix_key || ""
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          pix_key: formData.pix_key
        })
        .eq('user_id', profile.user_id)
        .select()
        .single();

      if (error) throw error;

      const updatedProfile = { ...profile, ...data };
      onProfileUpdate(updatedProfile);

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpdate = (avatarUrl: string) => {
    const updatedProfile = { ...profile, avatar_url: avatarUrl };
    onProfileUpdate(updatedProfile);
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(profile.referral_code);
    toast({
      title: "Copiado!",
      description: "Código de indicação copiado para a área de transferência",
    });
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-plan-free text-white';
      case 'vip': return 'bg-plan-vip text-white';
      case 'pro': return 'bg-plan-pro text-white';
      default: return 'bg-plan-free text-white';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações do Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e configurações da conta
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Avatar and Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Foto do Perfil</CardTitle>
            <CardDescription>
              Atualize sua foto de perfil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarUpload
              currentAvatarUrl={profile.avatar_url}
              onAvatarUpdate={handleAvatarUpdate}
              userId={profile.user_id}
              userName={profile.full_name}
            />
          </CardContent>
        </Card>

        {/* Plan Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Conta</CardTitle>
            <CardDescription>
              Detalhes do seu plano e estatísticas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Plano Atual:</span>
              <Badge className={getPlanBadgeColor(profile.plan)}>
                {profile.plan.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tempo Total:</span>
              <span className="text-sm">{Math.floor(profile.total_session_time / 60)}h {profile.total_session_time % 60}m</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Áreas Acessadas:</span>
              <span className="text-sm">{profile.areas_accessed}</span>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Atualize suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <Label htmlFor="pix_key">Chave PIX</Label>
                <Input
                  id="pix_key"
                  value={formData.pix_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, pix_key: e.target.value }))}
                  placeholder="Sua chave PIX para recebimentos"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Referral Program */}
        <Card>
          <CardHeader>
            <CardTitle>Programa de Indicação</CardTitle>
            <CardDescription>
              Compartilhe e ganhe com suas indicações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Seu Código de Indicação</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={profile.referral_code}
                  readOnly
                  className="bg-muted"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyReferralCode}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ganhos Totais:</span>
                <span className="text-sm font-bold text-green-600">
                  R$ {profile.referral_earnings.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Compartilhe seu código e ganhe comissão quando seus indicados fizerem upgrade
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
