
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquareOff, Shield } from "lucide-react";

export const AdminChatControl = () => {
  const [globalChatBlocked, setGlobalChatBlocked] = useState(false);
  const [globalBlockUntil, setGlobalBlockUntil] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchChatSettings();
  }, []);

  const fetchChatSettings = async () => {
    try {
      console.log('🔍 Buscando configurações do chat...');
      const { data, error } = await supabase
        .from('admin_settings')
        .select('chat_blocked_until')
        .eq('key', 'global_chat_settings')
        .maybeSingle();

      console.log('📊 Configurações obtidas:', data);
      console.log('❓ Erro na busca:', error);

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erro ao buscar configurações:', error);
        return;
      }
      
      if (data?.chat_blocked_until) {
        const blockUntil = new Date(data.chat_blocked_until);
        const now = new Date();
        const isBlocked = blockUntil > now;
        
        console.log(`⏰ Bloqueio até: ${blockUntil.toISOString()}`);
        console.log(`⏰ Agora: ${now.toISOString()}`);
        console.log(`🔒 Está bloqueado? ${isBlocked}`);
        
        setGlobalChatBlocked(isBlocked);
        setGlobalBlockUntil(blockUntil.toISOString().slice(0, 16));
      } else {
        console.log('✅ Nenhum bloqueio global ativo');
        setGlobalChatBlocked(false);
        setGlobalBlockUntil("");
      }
    } catch (error) {
      console.error('💥 Error fetching chat settings:', error);
    }
  };


  const toggleGlobalChatBlock = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Toggling global chat block. Current state:', globalChatBlocked);
      
      let blockUntil;
      if (globalChatBlocked) {
        // Desbloqueando: definir como null para desbloquear COMPLETAMENTE
        blockUntil = null;
        console.log('🔓 Desbloqueando chat global - removendo bloqueio completamente');
      } else {
        // Bloqueando: usar data definida ou 24h por padrão
        const currentTime = new Date();
        const saoPauloTime = new Date(currentTime.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
        blockUntil = globalBlockUntil ? new Date(globalBlockUntil) : new Date(saoPauloTime.getTime() + 24 * 60 * 60 * 1000);
        console.log('🔒 Bloqueando chat global até:', blockUntil.toISOString());
      }

      // Primeiro, deletar a configuração existente para garantir limpeza
      if (globalChatBlocked && blockUntil === null) {
        console.log('🗑️ Removendo configuração de bloqueio global...');
        const { error: deleteError } = await supabase
          .from('admin_settings')
          .delete()
          .eq('key', 'global_chat_settings');

        if (deleteError && deleteError.code !== 'PGRST116') {
          console.error('❌ Erro ao deletar configuração:', deleteError);
          throw deleteError;
        }
        console.log('✅ Configuração de bloqueio removida com sucesso');
      } else {
        // Inserir ou atualizar configuração
        const { error } = await supabase
          .from('admin_settings')
          .upsert({
            key: 'global_chat_settings',
            value: {},
            chat_blocked_until: blockUntil?.toISOString()
          }, {
            onConflict: 'key'
          });

        if (error) {
          console.error('❌ Erro ao atualizar configuração:', error);
          throw error;
        }
        console.log('✅ Configuração atualizada com sucesso');
      }

      // Atualizar estado local
      setGlobalChatBlocked(!globalChatBlocked);
      if (globalChatBlocked) {
        setGlobalBlockUntil(""); // Limpar data quando desbloqueando
      }

      toast({
        title: "Sucesso",
        description: `Chat global ${!globalChatBlocked ? 'bloqueado' : 'desbloqueado'} com sucesso`,
      });

      // Recarregar configurações após um delay
      setTimeout(() => {
        fetchChatSettings();
      }, 1000);

    } catch (error) {
      console.error('💥 Error updating global chat:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar configuração do chat",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Controle Global do Chat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Controle Global do Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Status do Chat Global</p>
              <p className="text-sm text-muted-foreground">
                {globalChatBlocked ? 'Chat bloqueado para todos os usuários' : 'Chat ativo para todos os usuários'}
              </p>
            </div>
            <Badge variant={globalChatBlocked ? "destructive" : "secondary"}>
              {globalChatBlocked ? "Bloqueado" : "Ativo"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="global-block-until">Bloquear até</Label>
              <Input
                id="global-block-until"
                type="datetime-local"
                value={globalBlockUntil}
                onChange={(e) => setGlobalBlockUntil(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={toggleGlobalChatBlock}
                variant={globalChatBlocked ? "outline" : "destructive"}
                disabled={isLoading}
                className="w-full"
              >
                <MessageSquareOff className="w-4 h-4 mr-2" />
                {globalChatBlocked ? "Desbloquear Chat" : "Bloquear Chat"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
