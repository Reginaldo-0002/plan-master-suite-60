import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, ArrowRight } from 'lucide-react';

interface ButtonConfig {
  text: string;
  value?: string;
  url?: string;
  variant?: 'default' | 'outline' | 'secondary';
}

interface CardItem {
  title: string;
  description: string;
  price?: string;
  features?: string[];
  button?: ButtonConfig;
  badge?: string;
}

interface ImageConfig {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

interface RichContent {
  buttons?: ButtonConfig[];
  items?: CardItem[];
  cards?: CardItem[];
  image?: ImageConfig;
  description?: string;
  links?: Array<{text: string; url: string}>;
  url?: string;
  text?: string;
}

interface RichMessageProps {
  type: 'text' | 'buttons' | 'image' | 'card' | 'link';
  title?: string;
  message: string;
  richContent?: RichContent;
  onButtonClick?: (value: string) => void;
  className?: string;
}

export const RichMessageRenderer: React.FC<RichMessageProps> = ({
  type,
  title,
  message,
  richContent,
  onButtonClick,
  className = ''
}) => {
  const handleButtonClick = (button: ButtonConfig) => {
    if (button.url) {
      window.open(button.url, '_blank');
    } else if (button.value && onButtonClick) {
      onButtonClick(button.value);
    } else if (button.text?.toLowerCase().includes('upgrade') || button.text?.toLowerCase().includes('plano')) {
      // Redirecionar para seção de planos no dashboard
      const currentUrl = new URL(window.location.href);
      if (currentUrl.pathname === '/dashboard') {
        // Se já está no dashboard, mudar apenas a aba
        window.location.hash = '#plans';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else {
        // Se não está no dashboard, navegar para lá com a aba de planos
        window.location.href = '/dashboard#plans';
      }
    }
  };

  const renderButtons = () => {
    if (!richContent?.buttons) return null;
    
    return (
      <div className="grid gap-1 mt-2 w-full">
        {richContent.buttons.map((button, index) => (
          <Button
            key={index}
            variant={button.variant || 'outline'}
            size="sm"
            onClick={() => handleButtonClick(button)}
            className="w-full text-xs h-7 justify-start px-2"
            title={button.text}
          >
            <span className="truncate text-left">{button.text}</span>
            {button.url && <ExternalLink className="w-3 h-3 ml-auto flex-shrink-0" />}
          </Button>
        ))}
      </div>
    );
  };

  const renderImage = () => {
    if (!richContent?.image) return null;
    
    return (
      <div className="mt-3 rounded-md overflow-hidden">
        <img
          src={richContent.image.url}
          alt={richContent.image.alt}
          className="w-full h-auto max-h-48 object-cover"
          width={richContent.image.width}
          height={richContent.image.height}
        />
      </div>
    );
  };

  const renderCards = () => {
    const cardData = richContent?.cards || richContent?.items;
    if (!cardData) return null;
    
    return (
      <div className="space-y-1 mt-2 w-full">
        {cardData.map((item, index) => (
          <Card key={index} className="border border-border/50 w-full overflow-hidden">
            <CardContent className="p-2">
              <div className="flex flex-col gap-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="font-medium text-foreground text-xs break-words flex-1 leading-tight">
                      {item.title}
                    </h4>
                    <div className="flex gap-1 flex-shrink-0">
                      {item.badge && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          {item.badge}
                        </Badge>
                      )}
                      {item.price && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 font-bold">
                          {item.price}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground break-words leading-tight">
                    {item.description}
                  </p>
                </div>
                {item.features && (
                  <ul className="text-[10px] text-muted-foreground space-y-0.5">
                    {item.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="w-1 h-1 rounded-full bg-primary mt-1 flex-shrink-0"></span>
                        <span className="break-words leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {item.button && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleButtonClick(item.button!)}
                    className="w-full text-[10px] h-6 mt-1"
                    title={item.button.text}
                  >
                    <span className="truncate">{item.button.text}</span>
                    <ArrowRight className="w-2.5 h-2.5 ml-1 flex-shrink-0" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderLinks = () => {
    if (!richContent?.links) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {richContent.links.map((link, index) => (
          <Button
            key={index}
            variant="link"
            size="sm"
            onClick={() => window.open(link.url, '_blank')}
            className="p-0 h-auto text-primary hover:text-primary/80"
          >
            {link.text}
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        ))}
      </div>
    );
  };

  return (
    <div className={`space-y-1 max-w-full min-w-0 overflow-hidden ${className}`}>
      {title && (
        <h3 className="font-semibold text-foreground text-xs break-words leading-tight">
          {title}
        </h3>
      )}
      
      <div className="text-xs text-foreground whitespace-pre-wrap break-words leading-relaxed word-wrap-anywhere">
        {message}
      </div>
      
      {richContent?.description && (
        <p className="text-[10px] text-muted-foreground mt-1 break-words leading-tight">
          {richContent.description}
        </p>
      )}

      {type === 'image' && renderImage()}
      {type === 'buttons' && renderButtons()}
      {type === 'card' && renderCards()}
      {type === 'link' && renderLinks()}
      
      {/* Special handling for 'link' type with single URL */}
      {type === 'link' && richContent?.url && richContent?.text && (
        <Button
          variant="link"
          size="sm"
          onClick={() => window.open(richContent.url, '_blank')}
          className="p-0 h-auto text-primary hover:text-primary/80 mt-2 text-xs w-full justify-start"
          title={richContent.text}
        >
          <span className="break-words truncate">{richContent.text}</span>
          <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
        </Button>
      )}
      
      {/* Render buttons for other types if they exist */}
      {type !== 'buttons' && richContent?.buttons && renderButtons()}
    </div>
  );
};