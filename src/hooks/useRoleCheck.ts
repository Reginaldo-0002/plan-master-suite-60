import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useErrorHandler } from './useErrorHandler';

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

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    await handleAsyncError(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRole(null);
        return;
      }

      // Use the secure function to get user role
      const { data, error } = await supabase.rpc('get_current_user_role');
      
      if (error) {
        console.error('Error fetching user role:', error);
        setRole('user'); // Default to user role
        return;
      }

      setRole(data as UserRole || 'user');
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