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
    }
  };

  const renderButtons = () => {
    if (!richContent?.buttons) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {richContent.buttons.map((button, index) => (
          <Button
            key={index}
            variant={button.variant || 'outline'}
            size="sm"
            onClick={() => handleButtonClick(button)}
            className="min-w-0 flex-1 sm:flex-none"
          >
            {button.text}
            {button.url && <ExternalLink className="w-3 h-3 ml-1" />}
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
      <div className="grid gap-3 mt-3">
        {cardData.map((item, index) => (
          <Card key={index} className="border border-border/50">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-foreground">{item.title}</h4>
                {item.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {item.badge}
                  </Badge>
                )}
                {item.price && (
                  <Badge variant="outline" className="text-xs font-bold">
                    {item.price}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {item.description}
              </p>
              {item.features && (
                <ul className="text-xs text-muted-foreground mb-3 space-y-1">
                  {item.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <span className="w-1 h-1 rounded-full bg-primary mr-2"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
              {item.button && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleButtonClick(item.button!)}
                  className="w-full"
                >
                  {item.button.text}
                  <ArrowRight className="w-3 h-3 ml-2" />
                </Button>
              )}
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
    <div className={`space-y-2 ${className}`}>
      {title && (
        <h3 className="font-semibold text-foreground text-sm">
          {title}
        </h3>
      )}
      
      <div className="text-sm text-foreground whitespace-pre-wrap">
        {message}
      </div>
      
      {richContent?.description && (
        <p className="text-xs text-muted-foreground mt-1">
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
          className="p-0 h-auto text-primary hover:text-primary/80 mt-3"
        >
          {richContent.text}
          <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      )}
      
      {/* Render buttons for other types if they exist */}
      {type !== 'buttons' && richContent?.buttons && renderButtons()}
    </div>
  );
};