import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { TopicsGallery } from "@/components/topics/TopicsGallery";

interface TopicsRouterProps {
  contentId: string;
  userPlan: 'free' | 'vip' | 'pro' | 'premium';
  onBack: () => void;
}

export const TopicsRouter = ({ contentId, userPlan, onBack }: TopicsRouterProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    console.log('TopicsRouter loaded with:', { contentId, userPlan });
    
    // Simulate loading and then show topics
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [contentId, userPlan]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <TopicsGallery contentId={contentId} userPlan={userPlan} onBack={onBack} />;
};