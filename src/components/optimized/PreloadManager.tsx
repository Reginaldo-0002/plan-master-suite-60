import { useEffect, memo } from 'react';

interface PreloadManagerProps {
  children: React.ReactNode;
}

export const PreloadManager = memo(({ children }: PreloadManagerProps) => {
  useEffect(() => {
    // Preload critical fonts
    const preloadFont = (href: string) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      link.href = href;
      document.head.appendChild(link);
    };

    // Preload Inter font weights used in the app
    const fontWeights = ['400', '500', '600', '700'];
    fontWeights.forEach(weight => {
      preloadFont(`https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2`);
    });

    // Preload critical CSS
    const preloadCSS = (href: string) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = href;
      document.head.appendChild(link);
    };

    // Preload critical images
    const preloadImage = (src: string) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    };

    // Critical resource hints for better performance
    const addResourceHints = () => {
      // DNS prefetch for external domains
      const dnsPrefetch = (href: string) => {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = href;
        document.head.appendChild(link);
      };

      dnsPrefetch('https://fonts.googleapis.com');
      dnsPrefetch('https://fonts.gstatic.com');

      // Preconnect to Supabase
      const preconnect = (href: string) => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = href;
        document.head.appendChild(link);
      };

      // Add your Supabase URL here
      // preconnect('https://your-project.supabase.co');
    };

    addResourceHints();

    // Optimize viewport for better rendering
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.setAttribute('name', 'viewport');
      document.head.appendChild(viewportMeta);
    }
    viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');

    // Add theme-color for better mobile experience
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.setAttribute('content', 'hsl(240, 21%, 15%)');

  }, []);

  return <>{children}</>;
});

PreloadManager.displayName = 'PreloadManager';