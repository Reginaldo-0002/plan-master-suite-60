import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseWrapper } from '@/lib/supabaseWrapper';
import { useErrorHandler } from './useErrorHandler';

interface Content {
  id: string;
  title: string;
  description: string;
  content_type: string;
  required_plan: string;
  is_active: boolean;
  status: string;
  hero_image_url: string;
  created_at: string;
  show_in_carousel: boolean;
  carousel_order: number;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  content_id: string;
  is_active: boolean;
  topic_order: number;
  topic_image_url?: string;
}

interface Resource {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  resource_url: string;
  topic_id: string;
  is_active: boolean;
  is_premium: boolean;
  required_plan: string;
  thumbnail_url?: string;
  resource_order: number;
}

export const useOptimizedContent = () => {
  const [contents, setContents] = useState<Content[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cache, setCache] = useState<Map<string, any>>(new Map());
  
  const { handleAsyncError } = useErrorHandler();

  // Memoized cache key generator
  const getCacheKey = useCallback((type: string, id?: string) => {
    return id ? `${type}_${id}` : type;
  }, []);

  // Optimized content fetcher with cache and proper typing
  const fetchContents = useCallback(async () => {
    const cacheKey = getCacheKey('contents');
    if (cache.has(cacheKey)) {
      setContents(cache.get(cacheKey));
      return;
    }

    return handleAsyncError(async () => {
      const result = await SupabaseWrapper.withTimeout(async () => {
        return await supabase
          .from('content')
          .select(`
            id, title, description, content_type, hero_image_url, created_at,
            required_plan, is_active, status, show_in_carousel, carousel_order
          `)
          .eq('is_active', true)
          .eq('status', 'published')
          .order('created_at', { ascending: false });
      }, { cacheKey });

      if (result.data) {
        const typedData = result.data as Content[];
        setContents(typedData);
        setCache(prev => new Map(prev).set(cacheKey, typedData));
      }
    });
  }, [cache, getCacheKey, handleAsyncError]);

  // Optimized topics fetcher with cache
  const fetchTopics = useCallback(async (contentId: string) => {
    const cacheKey = getCacheKey('topics', contentId);
    if (cache.has(cacheKey)) {
      setTopics(cache.get(cacheKey));
      return;
    }

    return handleAsyncError(async () => {
      const result = await SupabaseWrapper.withTimeout(async () => {
        return await supabase
          .from('content_topics')
          .select('id, title, description, content_id, is_active, topic_order, topic_image_url')
          .eq('content_id', contentId)
          .eq('is_active', true)
          .order('topic_order', { ascending: true });
      }, { cacheKey });

      if (result.data) {
        const typedData = result.data as Topic[];
        setTopics(typedData);
        setCache(prev => new Map(prev).set(cacheKey, typedData));
      }
    });
  }, [cache, getCacheKey, handleAsyncError]);

  // Optimized resources fetcher with cache
  const fetchResources = useCallback(async (topicId: string) => {
    const cacheKey = getCacheKey('resources', topicId);
    if (cache.has(cacheKey)) {
      setResources(cache.get(cacheKey));
      return;
    }

    return handleAsyncError(async () => {
      const result = await SupabaseWrapper.withTimeout(async () => {
        return await supabase
          .from('topic_resources')
          .select('*')
          .eq('topic_id', topicId)
          .eq('is_active', true)
          .order('resource_order', { ascending: true });
      }, { cacheKey });

      if (result.data) {
        const typedData = result.data as Resource[];
        setResources(typedData);
        setCache(prev => new Map(prev).set(cacheKey, typedData));
      }
    });
  }, [cache, getCacheKey, handleAsyncError]);

  // Clear cache for specific key or all
  const clearCache = useCallback((key?: string) => {
    if (key) {
      setCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(key);
        return newCache;
      });
    } else {
      setCache(new Map());
    }
  }, []);

  // Memoized filtered contents
  const carouselContents = useMemo(() => 
    contents.filter(c => c.show_in_carousel).sort((a, b) => a.carousel_order - b.carousel_order),
    [contents]
  );

  const publishedContents = useMemo(() => 
    contents.filter(c => c.status === 'published'),
    [contents]
  );

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await fetchContents();
      setIsLoading(false);
    };
    
    loadInitialData();
  }, [fetchContents]);

  return {
    contents,
    topics,
    resources,
    isLoading,
    carouselContents,
    publishedContents,
    fetchContents,
    fetchTopics,
    fetchResources,
    clearCache,
    // Performance utilities
    cacheSize: cache.size,
    isCached: (type: string, id?: string) => cache.has(getCacheKey(type, id))
  };
};