
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User } from "lucide-react";
import { AvatarUpload } from "@/components/media/AvatarUpload";
import { ReferralSystem } from "./ReferralSystem";
import { Profile } from "@/types/profile";
import { useProfileRealtime } from "@/hooks/useProfileRealtime";

interface ProfileSettingsProps {
  profile: Profile;
  onProfileUpdate: (updatedProfile: Profile) => void;
}

export const ProfileSettings = ({ profile, onProfileUpdate }: ProfileSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile.full_name || "",
    pix_key: profile.pix_key || "",
    whatsapp: (profile as any).whatsapp || "",
    purchase_source: (profile as any).purchase_source || "",
  });
  const { toast } = useToast();
  const { profile: realtimeProfile } = useProfileRealtime(profile.user_id);

  // Usar o perfil em tempo real se disponível, senão usar o perfil prop
  const currentProfile = realtimeProfile || profile;

  useEffect(() => {
    setFormData({
      full_name: currentProfile.full_name || "",
      pix_key: currentProfile.pix_key || "",
      whatsapp: (currentProfile as any).whatsapp || "",
      purchase_source: (currentProfile as any).purchase_source || "",
    });
  }, [currentProfile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Validação do nome completo
      if (formData.full_name.length < 14) {
        toast({
          title: "Erro",
          description: "Nome completo deve ter pelo menos 14 caracteres",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim() || null,
          pix_key: formData.pix_key.trim() || null,
          whatsapp: formData.whatsapp.trim() || null,
          purchase_source: formData.purchase_source || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentProfile.user_id)
        .select()
        .single();

      if (error) throw error;

      // Atualizar ambos os estados para garantir sincronização
      onProfileUpdate(data);
      
      // Forçar atualização do formulário com os novos dados
      setFormData({
        full_name: data.full_name || "",
        pix_key: data.pix_key || "",
        whatsapp: data.whatsapp || "",
        purchase_source: data.purchase_source || "",
      });
      
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    console.log('🖼️ Avatar updated, new URL:', newAvatarUrl);
    const updatedProfile = { ...currentProfile, avatar_url: newAvatarUrl, updated_at: new Date().toISOString() };
    onProfileUpdate(updatedProfile);
    
    // Force component re-render
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Configurações do Perfil
          </CardTitle>
          <CardDescription>
            Gerencie suas informações pessoais e configurações da conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <AvatarUpload
              currentAvatarUrl={currentProfile.avatar_url || null}
              onAvatarUpdate={handleAvatarUpdate}
              userId={currentProfile.user_id}
              userName={currentProfile.full_name}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Digite seu nome completo (mínimo 14 caracteres)"
              />
              {formData.full_name.length > 0 && formData.full_name.length < 14 && (
                <p className="text-sm text-destructive">Nome completo deve ter pelo menos 14 caracteres</p>
              )}
            </div>

            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <Label htmlFor="purchase_source">Onde você comprou seu acesso?</Label>
              <Select value={formData.purchase_source} onValueChange={(value) => setFormData(prev => ({ ...prev, purchase_source: value }))}>
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

            <div>
              <Label htmlFor="pix_key">Chave PIX (para recebimento de comissões)</Label>
              <Input
                id="pix_key"
                value={formData.pix_key}
                onChange={(e) => setFormData(prev => ({ ...prev, pix_key: e.target.value }))}
                placeholder="Email, CPF, telefone ou chave aleatória"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Necessário para receber pagamentos do programa de indicações
              </p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </CardContent>
      </Card>

      <ReferralSystem profile={currentProfile} />
    </div>
  );
};
