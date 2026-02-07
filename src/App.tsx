import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AIChatWidget } from "@/components/AIChatWidget";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CalendarPage from "./pages/CalendarPage";
import SharedObligation from "./pages/SharedObligation";
import DocumentVault from "./pages/DocumentVault";
import WeeklyDigest from "./pages/WeeklyDigest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/vault" element={<DocumentVault />} />
            <Route path="/digest" element={<WeeklyDigest />} />
            <Route path="/shared/:token" element={<SharedObligation />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <AIChatWidget />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
