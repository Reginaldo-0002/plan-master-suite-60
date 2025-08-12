import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { TopicsGallery } from "@/components/topics/TopicsGallery";

interface TopicsRouterProps {
  contentId: string;
}

export const TopicsRouter = ({ contentId }: TopicsRouterProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    console.log('TopicsRouter loaded with contentId:', contentId);
    
    // Simulate loading and then show topics
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [contentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <TopicsGallery contentId={contentId} userPlan="free" onBack={() => {}} />;
};