import { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export const LoadingSkeleton = memo(({ className, lines = 3 }: LoadingSkeletonProps) => (
  <div className={cn("space-y-3", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={cn(
          "h-4 bg-muted rounded shimmer",
          i === lines - 1 ? "w-3/4" : "w-full"
        )}
      />
    ))}
  </div>
));

LoadingSkeleton.displayName = 'LoadingSkeleton';

interface CardSkeletonProps {
  className?: string;
  showImage?: boolean;
}

export const CardSkeleton = memo(({ className, showImage = true }: CardSkeletonProps) => (
  <div className={cn("border rounded-lg overflow-hidden", className)}>
    {showImage && (
      <div className="h-48 bg-muted shimmer" />
    )}
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <div className="h-6 bg-muted rounded shimmer" />
        <div className="h-4 bg-muted rounded w-3/4 shimmer" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded shimmer" />
        <div className="h-4 bg-muted rounded shimmer" />
        <div className="h-4 bg-muted rounded w-2/3 shimmer" />
      </div>
      <div className="h-10 bg-muted rounded shimmer" />
    </div>
  </div>
));

CardSkeleton.displayName = 'CardSkeleton';

interface SpinnerLoadingProps {
  className?: string;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SpinnerLoading = memo(({ 
  className, 
  message = "Carregando...", 
  size = 'md' 
}: SpinnerLoadingProps) => {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <div className="flex items-center gap-2">
        <Loader2 className={cn("animate-spin text-primary", iconSizes[size])} />
        <span className="text-muted-foreground">{message}</span>
      </div>
    </div>
  );
});

SpinnerLoading.displayName = 'SpinnerLoading';

interface PageLoadingProps {
  message?: string;
}

export const PageLoading = memo(({ message = "Carregando..." }: PageLoadingProps) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex items-center gap-2">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <span className="text-lg">{message}</span>
    </div>
  </div>
));

PageLoading.displayName = 'PageLoading';

interface GridSkeletonProps {
  items?: number;
  className?: string;
}

export const GridSkeleton = memo(({ items = 6, className }: GridSkeletonProps) => (
  <div className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3", className)}>
    {Array.from({ length: items }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
));

GridSkeleton.displayName = 'GridSkeleton';