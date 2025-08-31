import React, { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface OptimizedLoaderProps {
  type: 'content' | 'topics' | 'resources' | 'dashboard';
  count?: number;
}

const ContentSkeleton = memo(() => (
  <Card className="w-full">
    <CardHeader>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-32 w-full rounded-md mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </CardContent>
  </Card>
));

const TopicSkeleton = memo(() => (
  <div className="border rounded-lg p-4 space-y-3">
    <Skeleton className="h-5 w-2/3" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-1/3" />
    <div className="flex space-x-2">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-8 w-20" />
    </div>
  </div>
));

const ResourceSkeleton = memo(() => (
  <div className="flex items-center space-x-3 p-3 border rounded-lg">
    <Skeleton className="h-10 w-10 rounded" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-8 w-8 rounded-full" />
  </div>
));

const DashboardSkeleton = memo(() => (
  <div className="space-y-6">
    {/* Header Skeleton */}
    <div className="space-y-2">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
    </div>
    
    {/* Cards Grid Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <ContentSkeleton key={i} />
      ))}
    </div>
    
    {/* Carousel Skeleton */}
    <div className="space-y-4">
      <Skeleton className="h-6 w-1/4" />
      <div className="flex space-x-4 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-80">
            <ContentSkeleton />
          </div>
        ))}
      </div>
    </div>
  </div>
));

export const OptimizedLoader: React.FC<OptimizedLoaderProps> = memo(({ 
  type, 
  count = 3 
}) => {
  const renderSkeletons = () => {
    switch (type) {
      case 'content':
        return Array.from({ length: count }).map((_, i) => (
          <ContentSkeleton key={i} />
        ));
      
      case 'topics':
        return Array.from({ length: count }).map((_, i) => (
          <TopicSkeleton key={i} />
        ));
      
      case 'resources':
        return Array.from({ length: count }).map((_, i) => (
          <ResourceSkeleton key={i} />
        ));
      
      case 'dashboard':
        return <DashboardSkeleton />;
      
      default:
        return <Skeleton className="h-20 w-full" />;
    }
  };

  return (
    <div className="space-y-4 animate-pulse">
      {renderSkeletons()}
    </div>
  );
});

OptimizedLoader.displayName = 'OptimizedLoader';