import { ReactNode } from 'react';
import { useRoleCheck, UserRole } from '@/hooks/useRoleCheck';
import { Loader2, ShieldX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RequireRoleProps {
  children: ReactNode;
  role: UserRole;
  fallback?: ReactNode;
}

export const RequireRole = ({ children, role, fallback }: RequireRoleProps) => {
  const { hasRole, loading } = useRoleCheck();

  console.log('RequireRole - role check:', { hasRole: hasRole(role), loading, requiredRole: role });

  if (loading) {
    console.log('RequireRole - Still loading, showing spinner');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasRole(role)) {
    return fallback || (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <ShieldX className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta área.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Entre em contato com um administrador se precisar de acesso.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};