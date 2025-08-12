
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  });
  const { toast } = useToast();
  const { profile: realtimeProfile } = useProfileRealtime(profile.user_id);

  // Usar o perfil em tempo real se disponível, senão usar o perfil prop
  const currentProfile = realtimeProfile || profile;

  useEffect(() => {
    setFormData({
      full_name: currentProfile.full_name || "",
      pix_key: currentProfile.pix_key || "",
    });
  }, [currentProfile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim() || null,
          pix_key: formData.pix_key.trim() || null,
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
    const updatedProfile = { ...currentProfile, avatar_url: newAvatarUrl };
    onProfileUpdate(updatedProfile);
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
                placeholder="Digite seu nome completo"
              />
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
