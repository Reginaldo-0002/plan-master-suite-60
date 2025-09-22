import { supabase } from '@/integrations/supabase/client';

interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class SupabaseWrapper {
  private static requestCache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_TTL = 60000; // 1 minute cache

  private static createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });
  }

  private static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static getCacheKey(operation: string, params?: any): string {
    return `${operation}_${JSON.stringify(params || {})}`;
  }

  private static isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  private static getFromCache(key: string) {
    const cached = this.requestCache.get(key);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    this.requestCache.delete(key);
    return null;
  }

  private static setCache(key: string, data: any) {
    this.requestCache.set(key, { data, timestamp: Date.now() });
    
    // Clean old cache entries
    if (this.requestCache.size > 100) {
      const now = Date.now();
      for (const [cacheKey, value] of this.requestCache.entries()) {
        if (!this.isCacheValid(value.timestamp)) {
          this.requestCache.delete(cacheKey);
        }
      }
    }
  }

  static async withTimeout<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    options: RequestOptions & { cacheKey?: string } = {}
  ): Promise<{ data: T | null; error: any }> {
    const { timeout = 5000, retries = 2, retryDelay = 500, cacheKey } = options;

    // Check cache first if cache key provided
    if (cacheKey) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { data: cached, error: null };
      }
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await Promise.race([
          operation(),
          this.createTimeoutPromise<{ data: T | null; error: any }>(timeout)
        ]);

        // Cache successful results
        if (cacheKey && result.data && !result.error) {
          this.setCache(cacheKey, result.data);
        }

        return result;
      } catch (error) {
        if (attempt === retries) {
          return { data: null, error: { message: 'Request failed after retries' } };
        }
        await this.delay(retryDelay * Math.pow(1.5, attempt));
      }
    }
    
    return { data: null, error: { message: 'Request failed' } };
  }

  // Optimized queries with field selection
  static async getNotifications(targetPlans: string[] = []) {
    return this.withTimeout(async () => {
      // Rely on RLS to deliver only notifications visible to the current user.
      return await supabase
        .from('notifications')
        .select('id, title, message, type, is_popup, popup_duration, created_at, target_plans, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);
    });
  }

  static async getRecentContent() {
    return this.withTimeout(async () => {
      return await supabase
        .from('content')
        .select(`
          id, title, description, content_type, hero_image_url, created_at,
          required_plan, is_active, status, show_in_carousel, carousel_order
        `)
        .eq('is_active', true)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
    }, { cacheKey: 'recent_content' });
  }

  static async getReferralStats(userId: string) {
    return this.withTimeout(async () => {
      return await supabase
        .from('referrals')
        .select('id, bonus_amount')
        .eq('referrer_id', userId);
    });
  }

  static async getUserProfile(userId: string) {
    return this.withTimeout(async () => {
      return await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
    });
  }

  static async checkTermsAcceptance(userId: string) {
    return this.withTimeout(async () => {
      return await supabase.rpc('has_accepted_terms', { user_uuid: userId });
    });
  }
}