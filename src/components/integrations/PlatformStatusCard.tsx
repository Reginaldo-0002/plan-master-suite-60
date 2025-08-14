import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface PlatformStatus {
  platform: string;
  isConnected: boolean;
  color: string;
}

export function PlatformStatusCard() {
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformStatus();
  }, []);

  const fetchPlatformStatus = async () => {
    try {
      // Fetch active webhook endpoints grouped by platform
      const { data: endpoints } = await supabase
        .from('webhook_endpoints')
        .select('provider, active')
        .eq('active', true);

      const platformsMap = new Map<string, boolean>();
      
      // Default platforms
      const defaultPlatforms = ['hotmart', 'kiwify', 'caktor', 'generic'];
      defaultPlatforms.forEach(platform => {
        platformsMap.set(platform, false);
      });

      // Update with actual data
      endpoints?.forEach(endpoint => {
        platformsMap.set(endpoint.provider, true);
      });

      const platformList: PlatformStatus[] = Array.from(platformsMap.entries()).map(([platform, isConnected]) => ({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        isConnected,
        color: getColorForPlatform(platform)
      }));

      setPlatforms(platformList);
    } catch (error) {
      console.error('Error fetching platform status:', error);
      // Set default platforms as disconnected on error
      setPlatforms([
        { platform: 'Hotmart', isConnected: false, color: 'bg-orange-500' },
        { platform: 'Kiwify', isConnected: false, color: 'bg-green-500' },
        { platform: 'Caktor', isConnected: false, color: 'bg-blue-500' },
        { platform: 'Genérico', isConnected: false, color: 'bg-gray-500' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getColorForPlatform = (platform: string): string => {
    switch (platform.toLowerCase()) {
      case 'hotmart': return 'bg-orange-500';
      case 'kiwify': return 'bg-green-500';
      case 'caktor': return 'bg-blue-500';
      case 'generic': return 'bg-gray-500';
      default: return 'bg-purple-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plataformas Conectadas</CardTitle>
          <CardDescription>
            Status das integrações com plataformas de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground">Carregando status das plataformas...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plataformas Conectadas</CardTitle>
        <CardDescription>
          Status das integrações com plataformas de pagamento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {platforms.map((platform) => (
          <div key={platform.platform} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${platform.color}`} />
              <span>{platform.platform}</span>
            </div>
            <Badge variant={platform.isConnected ? "default" : "secondary"}>
              {platform.isConnected ? "Conectado" : "Não conectado"}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}