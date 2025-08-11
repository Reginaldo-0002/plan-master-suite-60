import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useNavigate } from "react-router-dom";
import { Profile } from "@/types/profile";

export default function Rules() {
  const [rules, setRules] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    fetchRules();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([
            {
              user_id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
              plan: 'free' as const
            }
          ])
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          return;
        }

        setProfile(newProfile);
      } else if (error) {
        console.error('Error fetching profile:', error);
        return;
      } else {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'site_rules')
        .single();

      if (error) throw error;
      
      if (data?.value && typeof data.value === 'object' && 'content' in data.value) {
        setRules(data.value.content as string);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
      setRules("Regras do site ainda não foram configuradas.");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar 
        profile={profile} 
        activeSection="rules" 
        onSectionChange={() => {}}
      />
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-border">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <BookOpen className="w-8 h-8 text-primary" />
                <CardTitle className="text-3xl font-bold text-foreground">
                  Regras e Termos de Uso
                </CardTitle>
              </div>
              <CardDescription className="text-lg">
                Leia atentamente as regras de uso da nossa plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-lg max-w-none">
              <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                {rules}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}