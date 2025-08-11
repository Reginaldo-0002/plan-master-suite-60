
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Auth from "./pages/Auth";
import Rules from "./pages/Rules";
import { ContentCarouselPage } from "./pages/ContentCarouselPage";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";
import Products from "./pages/Products";
import Courses from "./pages/Courses";
import Tools from "./pages/Tools";
import Tutorials from "./pages/Tutorials";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Não retry em erros de autenticação
        if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false,
    },
  },
});

// Loading component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Suspense fallback={<LoadingFallback />}>
            <TooltipProvider delayDuration={300} skipDelayDuration={100}>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/rules" element={<Rules />} />
                  <Route path="/produtos" element={<Products />} />
                  <Route path="/cursos" element={<Courses />} />
                  <Route path="/ferramentas" element={<Tools />} />
                  <Route path="/tutoriais" element={<Tutorials />} />
                  <Route path="/carousel" element={<ContentCarouselPage userPlan="free" />} />
                  <Route path="/em-breve" element={<ComingSoon />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </Suspense>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
