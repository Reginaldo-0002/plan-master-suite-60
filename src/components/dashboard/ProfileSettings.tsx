
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Shield } from "lucide-react";
import { AvatarUpload } from "@/components/media/AvatarUpload";
import { ReferralSystem } from "./ReferralSystem";
import { Profile } from "@/types/profile";
import { useProfileData } from "@/hooks/useProfileData";
import { useChatRestrictions } from "@/hooks/useChatRestrictions";

interface ProfileSettingsProps {
  profile: Profile;
  onProfileUpdate: (updatedProfile: Profile) => void;
}

export const ProfileSettings = ({ profile: initialProfile, onProfileUpdate }: ProfileSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: initialProfile.full_name || "",
    pix_key: initialProfile.pix_key || "",
  });
  
  // Use custom hooks for real-time data
  const { profile: realtimeProfile, updateProfile } = useProfileData(initialProfile.user_id);
  const { isBlocked, blockReason, blockedUntil } = useChatRestrictions(initialProfile.user_id);
  const { toast } = useToast();

  // Use real-time profile if available, fallback to initial
  const currentProfile = realtimeProfile || initialProfile;

  useEffect(() => {
    setFormData({
      full_name: currentProfile.full_name || "",
      pix_key: currentProfile.pix_key || "",
    });
  }, [currentProfile]);

  // Real-time subscription for profile changes
  useEffect(() => {
    if (!currentProfile.user_id) return;

    const channel = supabase
      .channel('profile-settings-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${currentProfile.user_id}`
        },
        (payload) => {
          console.log('ProfileSettings: Real-time profile update:', payload);
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedProfile = payload.new as Profile;
            onProfileUpdate(updatedProfile);
            
            toast({
              title: "Perfil Sincronizado",
              description: "Suas informações foram atualizadas automaticamente",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProfile.user_id, onProfileUpdate, toast]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updates = {
        full_name: formData.full_name.trim() || null,
        pix_key: formData.pix_key.trim() || null,
      };

      const updatedProfile = await updateProfile(updates);
      
      if (updatedProfile) {
        onProfileUpdate(updatedProfile);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    const updatedProfile = await updateProfile({ avatar_url: newAvatarUrl });
    if (updatedProfile) {
      onProfileUpdate(updatedProfile);
    }
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

      {/* Chat Status Card */}
      <Card className={`border-2 ${isBlocked ? 'border-destructive/50 bg-destructive/5' : 'border-success/50 bg-success/5'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Status do Chat
          </CardTitle>
          <CardDescription>
            Situação atual do seu acesso ao chat de suporte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isBlocked 
                  ? 'bg-destructive/20 text-destructive border border-destructive/30' 
                  : 'bg-success/20 text-success border border-success/30'
              }`}>
                {isBlocked ? '🚫 Bloqueado' : '✅ Liberado'}
              </span>
            </div>
            
            {isBlocked && (
              <>
                {blockReason && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm font-medium text-destructive">Motivo:</p>
                    <p className="text-sm text-destructive/80">{blockReason}</p>
                  </div>
                )}
                
                {blockedUntil && (
                  <div className="p-3 bg-muted/50 border border-muted rounded-lg">
                    <p className="text-sm font-medium">Liberação programada para:</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(blockedUntil).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
              </>
            )}
            
            {!isBlocked && (
              <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-sm text-success">
                  ✨ Você pode usar o chat de suporte normalmente
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ReferralSystem profile={currentProfile} />
    </div>
  );
};
