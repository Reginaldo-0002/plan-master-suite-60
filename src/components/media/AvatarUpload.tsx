
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  onAvatarUpdate: (url: string) => void;
  userId: string;
  userName: string | null;
}

export const AvatarUpload = ({ currentAvatarUrl, onAvatarUpdate, userId, userName }: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true);

      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Por favor, selecione apenas arquivos de imagem');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('A imagem deve ter no máximo 5MB');
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Remove old avatar if exists
      if (currentAvatarUrl) {
        try {
          const oldPath = currentAvatarUrl.split('/').slice(-2).join('/');
          await supabase.storage
            .from('avatars')
            .remove([oldPath]);
        } catch (error) {
          console.log('Could not remove old avatar:', error);
        }
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!publicUrl) {
        throw new Error('Erro ao obter URL da imagem');
      }

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Erro ao atualizar perfil: ${updateError.message}`);
      }

      onAvatarUpdate(publicUrl);
      toast({
        title: "Sucesso",
        description: "Avatar atualizado com sucesso!",
      });

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao fazer upload do avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadAvatar(file);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="h-24 w-24">
          <AvatarImage src={currentAvatarUrl || ""} />
          <AvatarFallback className="text-lg">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </AvatarFallback>
        </Avatar>
        
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-full cursor-pointer">
          <Camera className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="avatar-upload"
          disabled={uploading}
        />
        <label htmlFor="avatar-upload">
          <Button
            variant="outline"
            disabled={uploading}
            className="cursor-pointer"
            asChild
          >
            <span>
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {uploading ? "Enviando..." : "Alterar Avatar"}
            </span>
          </Button>
        </label>
        <p className="text-xs text-muted-foreground text-center">
          JPG, PNG até 5MB
        </p>
      </div>
    </div>
  );
};
