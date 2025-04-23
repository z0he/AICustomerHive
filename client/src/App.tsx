import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

import Dashboard from "@/pages/Dashboard";
import Campaigns from "@/pages/Campaigns";
import CampaignDetail from "@/pages/CampaignDetail";
import Customers from "@/pages/Customers";
import Analytics from "@/pages/Analytics";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";

// Custom placeholder page for routes under development
const UnderDevelopment = ({ title }: { title: string }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
      <h1 className="text-3xl font-bold text-slate-800 mb-4">{title}</h1>
      <p className="text-slate-600 mb-8">This page is under development.</p>
      <a href="/dashboard" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">
        Back to Dashboard
      </a>
    </div>
  );
};

function Router() {
  return (
    <Switch>
      {/* Protected routes */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/customers" component={Customers} />
      <ProtectedRoute path="/campaigns" component={Campaigns} />
      <ProtectedRoute path="/analytics" component={Analytics} />
      
      {/* Campaign detail route */}
      <ProtectedRoute path="/campaigns/:id" component={CampaignDetail} />
      
      {/* Protected routes still under development */}
      <ProtectedRoute path="/messages" component={() => <UnderDevelopment title="Messages" />} />
      <ProtectedRoute path="/settings" component={() => <UnderDevelopment title="Settings" />} />
      
      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter>
          <Router />
          <Toaster />
        </WouterRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
