
import { useState } from "react";
import { ContentCarousel } from "@/components/carousel/ContentCarousel";
import { TopicsGallery } from "@/components/topics/TopicsGallery";
import { Badge } from "@/components/ui/badge";

interface ContentCarouselPageProps {
  userPlan: 'free' | 'vip' | 'pro';
}

export const ContentCarouselPage = ({ userPlan }: ContentCarouselPageProps) => {
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  const handleContentClick = (contentId: string) => {
    setSelectedContentId(contentId);
  };

  const handleBack = () => {
    setSelectedContentId(null);
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'vip': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (selectedContentId) {
    return (
      <TopicsGallery 
        contentId={selectedContentId} 
        userPlan={userPlan} 
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="flex-1 space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Conteúdos em Destaque
          </h2>
          <p className="text-muted-foreground">
            Explore nossos produtos, ferramentas, cursos e tutoriais
          </p>
        </div>
        <Badge className={getPlanBadgeColor(userPlan)}>
          Plano {userPlan.toUpperCase()}
        </Badge>
      </div>

      {/* Carousel */}
      <ContentCarousel 
        userPlan={userPlan} 
        onContentClick={handleContentClick}
      />
    </div>
  );
};
