import { useEffect } from 'react';

export const ReferralCapture = () => {
  useEffect(() => {
    // Capturar código de referência da URL quando a página carrega
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref') || urlParams.get('referral');
    
    if (referralCode) {
      // Armazenar no localStorage para usar durante o checkout
      localStorage.setItem('referral_code', referralCode);
      console.log('🎯 Código de referência capturado:', referralCode);
      
      // Limpar a URL para não mostrar o código (opcional)
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Este componente não renderiza nada
  return null;
};