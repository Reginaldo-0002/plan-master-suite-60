import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useOptimizedNavigation = () => {
  const navigate = useNavigate();

  // Navegação otimizada sem recarregar a página
  const navigateTo = useCallback((path: string, options?: { replace?: boolean; state?: any }) => {
    console.log('🧭 Navigating to:', path);
    navigate(path, options);
  }, [navigate]);

  // Navegação para seções do dashboard sem recarregar
  const navigateToDashboardSection = useCallback((section: string) => {
    console.log('🧭 Navigating to dashboard section:', section);
    navigate(`/dashboard?section=${section}`);
  }, [navigate]);

  // Navegação para admin com hash
  const navigateToAdmin = useCallback((hash?: string) => {
    const adminPath = hash ? `/admin#${hash}` : '/admin';
    console.log('🧭 Navigating to admin:', adminPath);
    navigate(adminPath);
  }, [navigate]);

  // Navegação para planos
  const navigateToPlans = useCallback(() => {
    console.log('🧭 Navigating to plans section');
    navigate('/dashboard?section=plans', { replace: true });
    // Force immediate URL update for instant navigation
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [navigate]);

  // Atualizar URL sem navegar (para estados internos)
  const updateUrlParams = useCallback((params: Record<string, string>) => {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Atualizar hash sem recarregar
  const updateHash = useCallback((hash: string) => {
    const url = new URL(window.location.href);
    url.hash = hash;
    window.history.replaceState({}, '', url.toString());
  }, []);

  return {
    navigateTo,
    navigateToDashboardSection,
    navigateToAdmin,
    navigateToPlans,
    updateUrlParams,
    updateHash,
  };
};