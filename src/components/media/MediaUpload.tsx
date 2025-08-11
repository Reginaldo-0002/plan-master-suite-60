
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Image as ImageIcon, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MediaUploadProps {
  onUploadComplete?: (url: string, metadata: any) => void;
  targetWidth?: number;
  targetHeight?: number;
  acceptedTypes?: string[];
}

export const MediaUpload = ({ 
  onUploadComplete, 
  targetWidth = 1920, 
  targetHeight = 1080,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']
}: MediaUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [tags, setTags] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resizeImage = (file: File): Promise<{ blob: Blob; width: number; height: number }> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate aspect ratio and resize
        const aspectRatio = img.width / img.height;
        const targetAspectRatio = targetWidth / targetHeight;
        
        let newWidth = targetWidth;
        let newHeight = targetHeight;
        
        if (aspectRatio > targetAspectRatio) {
          newHeight = targetWidth / aspectRatio;
        } else {
          newWidth = targetHeight * aspectRatio;
        }
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        
        canvas.toBlob((blob) => {
          resolve({ 
            blob: blob!, 
            width: newWidth, 
            height: newHeight 
          });
        }, 'image/webp', 0.9);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!acceptedTypes.includes(selectedFile.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione uma imagem JPG, PNG ou WebP",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    
    try {
      // Resize image
      const { blob, width, height } = await resizeImage(file);
      
      // Generate unique filename
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
      
      // Upload to Supabase Storage (you'll need to create a bucket first)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      // Save to media library
      const { data: mediaData, error: mediaError } = await supabase
        .from('media_library')
        .insert([{
          file_name: fileName,
          file_url: publicUrl,
          file_type: 'image/webp',
          file_size: blob.size,
          width,
          height,
          alt_text: altText || '',
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        }])
        .select()
        .single();

      if (mediaError) throw mediaError;

      toast({
        title: "Upload concluído!",
        description: `Imagem redimensionada para ${width}x${height} e salva na biblioteca`,
      });

      if (onUploadComplete) {
        onUploadComplete(publicUrl, mediaData);
      }

      // Reset form
      setFile(null);
      setPreview(null);
      setAltText("");
      setTags("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível fazer upload da imagem",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const clearPreview = () => {
    setFile(null);
    setPreview(null);
    setAltText("");
    setTags("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="bg-background/60 backdrop-blur-sm border-futuristic-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-futuristic-primary">
          <ImageIcon className="w-5 h-5" />
          Upload de Mídia ({targetWidth}x{targetHeight})
        </CardTitle>
        <CardDescription>
          Faça upload de imagens que serão automaticamente otimizadas para {targetWidth}x{targetHeight}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!preview ? (
          <div className="border-2 border-dashed border-futuristic-primary/30 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto text-futuristic-primary mb-4" />
            <p className="text-muted-foreground mb-4">
              Clique para selecionar uma imagem ou arraste aqui
            </p>
            <Input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="border-futuristic-primary text-futuristic-primary hover:bg-futuristic-primary/10"
            >
              Selecionar Arquivo
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-48 object-cover rounded-lg border border-futuristic-primary/20"
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={clearPreview}
                className="absolute top-2 right-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="altText">Texto Alternativo</Label>
                <Input
                  id="altText"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Descrição da imagem para acessibilidade"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="ex: conteúdo, tutorial, premium"
                />
              </div>
            </div>

            <Button 
              onClick={handleUpload} 
              disabled={uploading}
              className="w-full bg-futuristic-gradient hover:opacity-90"
            >
              {uploading ? (
                "Fazendo upload..."
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar Upload
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
