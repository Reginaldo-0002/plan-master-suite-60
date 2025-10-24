import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, X, Loader2, Crown, Gem, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOptimizedNavigation } from '@/hooks/useOptimizedNavigation';

interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  required_plan: 'free' | 'vip' | 'pro' | 'premium';
  hero_image_url: string | null;
}

interface GlobalSearchProps {
  onContentSelect?: (contentId: string) => void;
}

export const GlobalSearch = ({ onContentSelect }: GlobalSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { navigateToPlans } = useOptimizedNavigation();

  const performSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchTerm = query.toLowerCase().trim();
      
      // Buscar em tempo real com filtros RLS automáticos
      const { data, error } = await supabase
        .from('content')
        .select('id, title, description, content_type, required_plan, hero_image_url')
        .eq('is_active', true)
        .eq('status', 'published')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ Search error:', error);
        throw error;
      }

      console.log('🔍 Search results:', data?.length || 0);
      setResults(data || []);
    } catch (error) {
      console.error('💥 Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  const handleResultClick = (result: SearchResult) => {
    console.log('Opening content:', result.id);
    if (onContentSelect) {
      onContentSelect(result.id);
    }
    setIsOpen(false);
    setSearchQuery('');
    setResults([]);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'pro': return <Crown className="w-3 h-3" />;
      case 'vip': return <Gem className="w-3 h-3" />;
      default: return <Star className="w-3 h-3" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro': return 'bg-plan-pro text-white';
      case 'vip': return 'bg-plan-vip text-white';
      default: return 'bg-plan-free text-white';
    }
  };

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          placeholder="Buscar produtos, cursos, ferramentas..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10 bg-background/60 backdrop-blur-sm border-futuristic-primary/30 focus:border-futuristic-primary"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (searchQuery || loading) && (
        <Card className="absolute top-full mt-2 w-full z-50 max-h-[400px] overflow-y-auto bg-background/95 backdrop-blur-md border-futuristic-primary/30 shadow-xl">
          <CardContent className="p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-futuristic-primary" />
              </div>
            ) : results.length === 0 && searchQuery ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum resultado encontrado</p>
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full text-left p-3 rounded-lg hover:bg-futuristic-primary/10 transition-colors border border-transparent hover:border-futuristic-primary/30"
                  >
                    <div className="flex items-start gap-3">
                      {result.hero_image_url && (
                        <img
                          src={result.hero_image_url}
                          alt={result.title}
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm truncate">{result.title}</h4>
                          <Badge className={`${getPlanColor(result.required_plan)} text-xs flex items-center gap-1`}>
                            {getPlanIcon(result.required_plan)}
                            <span className="uppercase">{result.required_plan}</span>
                          </Badge>
                        </div>
                        {result.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {result.description}
                          </p>
                        )}
                        <p className="text-xs text-futuristic-primary mt-1 capitalize">
                          {result.content_type}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
