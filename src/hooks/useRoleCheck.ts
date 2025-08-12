import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useErrorHandler } from './useErrorHandler';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'moderator' | 'user';

interface RoleCheckResult {
  role: UserRole | null;
  hasRole: (requiredRole: UserRole) => boolean;
  isAdmin: boolean;
  isModerator: boolean;
  loading: boolean;
}

export const useRoleCheck = (): RoleCheckResult => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { handleAsyncError } = useErrorHandler();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      checkUserRole();
    }
  }, [user, authLoading]);

  const checkUserRole = async () => {
    if (!user) {
      console.log('useRoleCheck - No authenticated user');
      setRole(null);
      setLoading(false);
      return;
    }

    await handleAsyncError(async () => {
      console.log('useRoleCheck - Checking role for user:', user.id);
      
      // Try the RPC function first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_current_user_role');
      
      console.log('useRoleCheck - RPC response:', { data: rpcData, error: rpcError });
      
      if (!rpcError && rpcData) {
        const userRole = rpcData as UserRole;
        console.log('useRoleCheck - Setting role from RPC to:', userRole);
        setRole(userRole);
        return;
      }

      // Fallback: query user_roles table directly
      console.log('useRoleCheck - RPC failed, trying direct query');
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleError) {
        console.error('Error fetching user role from table:', roleError);
        setRole('user');
        return;
      }

      const userRole = (roleData?.role as UserRole) || 'user';
      console.log('useRoleCheck - Setting role from direct query to:', userRole);
      setRole(userRole);
    }, {
      title: "Erro ao verificar permissões",
      showToast: false
    });
    
    setLoading(false);
  };

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!role) return false;
    
    if (requiredRole === 'user') return true;
    if (requiredRole === 'moderator') return role === 'moderator' || role === 'admin';
    if (requiredRole === 'admin') return role === 'admin';
    
    return false;
  };

  return {
    role,
    hasRole,
    isAdmin: role === 'admin',
    isModerator: role === 'moderator' || role === 'admin',
    loading
  };
};