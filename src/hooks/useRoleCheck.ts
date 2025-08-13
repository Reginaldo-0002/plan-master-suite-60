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
  refreshRole: () => Promise<void>;
}

export const useRoleCheck = (): RoleCheckResult => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { handleAsyncError } = useErrorHandler();

  const checkUserRoleDirectly = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('useRoleCheck - No user found');
        setRole(null);
        setLoading(false);
        return;
      }

      console.log('useRoleCheck - User found, checking role:', user.id);

      // Buscar role diretamente da tabela user_roles
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1);

      console.log('useRoleCheck - Direct role check:', { userRoles, error });

      if (error) {
        console.error('Error fetching user role directly:', error);
        setRole('user');
      } else if (userRoles && userRoles.length > 0) {
        const userRole = userRoles[0].role as UserRole;
        console.log('useRoleCheck - Setting role to:', userRole);
        setRole(userRole);
      } else {
        console.log('useRoleCheck - No role found, defaulting to user');
        setRole('user');
      }
    } catch (error) {
      console.error('Error in role check:', error);
      setRole('user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUserRoleDirectly();

    // Configurar listener real-time para mudanças nos roles
    const channel = supabase
      .channel('user-roles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_roles'
      }, async (payload) => {
        console.log('Role changed, refreshing...', payload);
        // Verificar se a mudança é para o usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        const newUserRole = payload.new as any;
        const oldUserRole = payload.old as any;
        
        if (user && (newUserRole?.user_id === user.id || oldUserRole?.user_id === user.id)) {
          console.log('Role change detected for current user, forcing refresh');
          // Forçar um reload completo da página para garantir que tudo seja atualizado
          window.location.reload();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Remover a função checkUserRole antiga

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!role) return false;
    
    if (requiredRole === 'user') return true;
    if (requiredRole === 'moderator') return role === 'moderator' || role === 'admin';
    if (requiredRole === 'admin') return role === 'admin';
    
    return false;
  };

  const refreshRole = async () => {
    setLoading(true);
    await checkUserRoleDirectly();
  };

  return {
    role,
    hasRole,
    isAdmin: role === 'admin',
    isModerator: role === 'moderator' || role === 'admin',
    loading,
    refreshRole
  };
};