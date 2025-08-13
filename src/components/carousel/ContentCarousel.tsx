
import { OptimizedCarousel } from "@/components/optimized/OptimizedCarousel";

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  required_plan: 'free' | 'vip' | 'pro';
  hero_image_url: string | null;
  carousel_image_url: string | null;
  video_url: string | null;
  carousel_order: number;
  estimated_duration: number | null;
  difficulty_level: string | null;
}

interface ContentCarouselProps {
  userPlan: 'free' | 'vip' | 'pro';
  onContentClick?: (contentId: string) => void;
}

export const ContentCarousel = ({ userPlan, onContentClick }: ContentCarouselProps) => {
  return <OptimizedCarousel userPlan={userPlan} onContentClick={onContentClick} />;
};
