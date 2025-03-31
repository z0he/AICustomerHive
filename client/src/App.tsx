import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

import Dashboard from "@/pages/Dashboard";
import Campaigns from "@/pages/Campaigns";
import Customers from "@/pages/Customers";
import Analytics from "@/pages/Analytics";
import Login from "@/pages/Login";
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
      <Route path="/" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      
      {/* Implemented routes */}
      <Route path="/customers" component={Customers} />
      <Route path="/campaigns" component={Campaigns} />
      <Route path="/analytics" component={Analytics} />
      
      {/* Routes still under development */}
      <Route path="/campaigns/:id">
        {(params) => <UnderDevelopment title={`Campaign #${params.id}`} />}
      </Route>
      <Route path="/messages" component={() => <UnderDevelopment title="Messages" />} />
      <Route path="/settings" component={() => <UnderDevelopment title="Settings" />} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
