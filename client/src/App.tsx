import { Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import ChatAssistant from "@/components/ai/ChatAssistant";
import FeedbackButton from "@/components/feedback/FeedbackButton";
import AppShell from "@/app/AppShell";
import { useEffect } from "react";
import { initGA } from "@/lib/analytics";
import { useAnalytics } from "@/hooks/use-analytics";
import { AppRoutes } from "@/app/routes";

function Router() {
  const { user } = useAuth();
  
  // Track page views when routes change
  useAnalytics();

  return (
    <AppShell>
      <AppRoutes user={user} />
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter>
          <AppContent />
        </WouterRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Separate component to use the auth context after it's been provided
function AppContent() {
  const { user } = useAuth();
  
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      console.log('Initializing Google Analytics');
      initGA();
    }
  }, []);
  
  return (
    <>
      <Router />
      {user && <ChatAssistant />}
      <FeedbackButton />
      <Toaster />
    </>
  );
}

export default App;
