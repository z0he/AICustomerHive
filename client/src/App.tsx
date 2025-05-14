import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import ChatAssistant from "@/components/ai/ChatAssistant";

import Dashboard from "@/pages/Dashboard";
import Campaigns from "@/pages/Campaigns";
import CampaignDetail from "@/pages/CampaignDetail";
import Customers from "@/pages/Customers";
import Analytics from "@/pages/Analytics";
import LeadManagement from "@/pages/LeadManagement";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import CustomerData from "@/pages/CustomerData";
import EmailManagement from "@/pages/EmailManagement";
import CalendarManagement from "@/pages/CalendarManagement";
import MarketingForms from "@/pages/MarketingForms";
import SettingsPage from "@/pages/Settings";
import SystemNotifications from "@/pages/SystemNotifications";
import Landing from "@/pages/Landing";

// Custom placeholder page for routes under development
const UnderDevelopment = ({ title }: { title: string }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
      <h1 className="text-3xl font-bold text-slate-800 mb-4">{title}</h1>
      <p className="text-slate-600 mb-8">This page is under development.</p>
      <a href="/dashboard" className="px-4 py-2 bg-[#0082AE] text-white rounded-md hover:bg-[#00556E] transition">
        Back to Dashboard
      </a>
    </div>
  );
};

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      {/* Home route - shows Landing to non-authenticated users */}
      <Route path="/">
        {user ? <Dashboard /> : <Landing />}
      </Route>
      
      {/* Protected routes */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/customers" component={Customers} />
      <ProtectedRoute path="/campaigns" component={Campaigns} />
      <ProtectedRoute path="/analytics" component={Analytics} />
      <ProtectedRoute path="/leads" component={LeadManagement} />
      <ProtectedRoute path="/customer-data" component={CustomerData} />
      <ProtectedRoute path="/email" component={EmailManagement} />
      <ProtectedRoute path="/calendar" component={CalendarManagement} />
      <ProtectedRoute path="/marketing-forms" component={MarketingForms} />
      
      {/* Campaign detail route */}
      <ProtectedRoute path="/campaigns/:id" component={CampaignDetail} />
      
      {/* Settings page */}
      <ProtectedRoute path="/settings" component={SettingsPage} />
      
      {/* Admin pages */}
      <ProtectedRoute path="/admin/notifications" component={SystemNotifications} />
      
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
          <AppContent />
        </WouterRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Separate component to use the auth context after it's been provided
function AppContent() {
  const { user } = useAuth();
  
  return (
    <>
      <Router />
      {user && <ChatAssistant />}
      <Toaster />
    </>
  );
}

export default App;
