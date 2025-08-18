import { supabase } from '@/integrations/supabase/client';

interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class SupabaseWrapper {
  private static createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });
  }

  private static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async withTimeout<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    options: RequestOptions = {}
  ): Promise<{ data: T | null; error: any }> {
    const { timeout = 8000, retries = 1, retryDelay = 1000 } = options;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await Promise.race([
          operation(),
          this.createTimeoutPromise<{ data: T | null; error: any }>(timeout)
        ]);
        return result;
      } catch (error) {
        if (attempt === retries) {
          return { data: null, error: { message: 'Request failed after retries' } };
        }
        await this.delay(retryDelay * Math.pow(2, attempt));
      }
    }
    
    return { data: null, error: { message: 'Request failed' } };
  }

  // Optimized queries with field selection
  static async getNotifications(targetPlans: string[] = []) {
    return this.withTimeout(async () => {
      return await supabase
        .from('notifications')
        .select('id, title, message, type, is_popup, popup_duration, created_at')
        .eq('is_active', true)
        .overlaps('target_plans', targetPlans)
        .order('created_at', { ascending: false })
        .limit(10);
    });
  }

  static async getRecentContent() {
    return this.withTimeout(async () => {
      return await supabase
        .from('content')
        .select('id, title, description, content_type, hero_image_url, created_at')
        .eq('is_active', true)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(6);
    });
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