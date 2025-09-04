import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { ProtectedRoute } from "@/lib/protected-route";
import { LegacyRedirect } from "@/components/LegacyRedirect";

// Existing pages
import Dashboard from "@/pages/Dashboard";
import Campaigns from "@/pages/Campaigns";
import CampaignDetail from "@/pages/CampaignDetail";
import Customers from "@/pages/Customers";
import Analytics from "@/pages/Analytics";
import LeadManagement from "@/pages/LeadManagement";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import CustomerData from "@/pages/CustomerData";
import CustomerJourney from "@/pages/CustomerJourney";
import DataConsistency from "@/pages/DataConsistency";
import EmailManagement from "@/pages/EmailManagement";
import CalendarManagement from "@/pages/CalendarManagement";
import MarketingForms from "@/pages/MarketingForms";
import TrackingSettings from "@/pages/TrackingSettings";
import SettingsPage from "@/pages/Settings";
import SystemNotifications from "@/pages/SystemNotifications";
import FeedbackList from "@/pages/FeedbackList";
import SimpleFeedback from "@/pages/SimpleFeedback";
import ScheduledEmails from "@/pages/ScheduledEmails";
import EmailDeliveryStatus from "@/pages/EmailDeliveryStatus";
import Landing from "@/pages/Landing";
import Features from "@/pages/Features";
import Pricing from "@/pages/Pricing";
import Contact from "@/pages/Contact";
import Demo from "@/pages/Demo";
import UnifiedSegments from "@/pages/UnifiedSegments";

// Lazy-loaded pages for new IA (using existing components or fallbacks)
const ContactsPage = lazy(() => 
  import("@/pages/Customers").then(module => ({
    default: module.default
  })).catch(() => ({
    default: () => <UnderDevelopment title="Contacts" />
  }))
);

const ContactsSegmentsPage = lazy(() => 
  import("@/pages/UnifiedSegments").then(module => ({
    default: module.default
  })).catch(() => ({
    default: () => <UnderDevelopment title="Contact Segments" />
  }))
);

const JourneysPage = lazy(() => 
  import("@/pages/CustomerJourney").then(module => ({
    default: module.default
  })).catch(() => ({
    default: () => <UnderDevelopment title="Customer Journeys" />
  }))
);

const AutomationWorkflowsPage = lazy(() => 
  Promise.resolve({
    default: () => <UnderDevelopment title="Automation Workflows" />
  })
);

const DataQualityPage = lazy(() => 
  import("@/pages/DataConsistency").then(module => ({
    default: module.default
  })).catch(() => ({
    default: () => <UnderDevelopment title="Data Quality" />
  }))
);

const SettingsIntegrationsTrackingPage = lazy(() => 
  import("@/pages/TrackingSettings").then(module => ({
    default: module.default
  })).catch(() => ({
    default: () => <UnderDevelopment title="Tracking Integrations" />
  }))
);

const DataPage = lazy(() => 
  import("@/pages/CustomerData").then(module => ({
    default: module.default
  })).catch(() => ({
    default: () => <UnderDevelopment title="Data Management" />
  }))
);

// Fallback component for pages under development
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

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0082AE]"></div>
  </div>
);

export function AppRoutes({ user }: { user: any }) {
  return (
    <Switch>
      {/* Home route - shows Landing to non-authenticated users */}
      <Route path="/">
        {user ? <Dashboard /> : <Landing />}
      </Route>

      {/* === NEW IA ROUTES === */}
      <ProtectedRoute 
        path="/contacts" 
        component={() => (
          <Suspense fallback={<PageLoader />}>
            <ContactsPage />
          </Suspense>
        )} 
      />

      <ProtectedRoute 
        path="/contacts/segments" 
        component={() => (
          <Suspense fallback={<PageLoader />}>
            <ContactsSegmentsPage />
          </Suspense>
        )} 
      />

      <ProtectedRoute 
        path="/journeys" 
        component={() => (
          <Suspense fallback={<PageLoader />}>
            <JourneysPage />
          </Suspense>
        )} 
      />

      <ProtectedRoute 
        path="/automation/workflows" 
        component={() => (
          <Suspense fallback={<PageLoader />}>
            <AutomationWorkflowsPage />
          </Suspense>
        )} 
      />

      <ProtectedRoute 
        path="/data/quality" 
        component={() => (
          <Suspense fallback={<PageLoader />}>
            <DataQualityPage />
          </Suspense>
        )} 
      />

      <ProtectedRoute 
        path="/settings/integrations/tracking" 
        component={() => (
          <Suspense fallback={<PageLoader />}>
            <SettingsIntegrationsTrackingPage />
          </Suspense>
        )} 
      />

      <ProtectedRoute 
        path="/data" 
        component={() => (
          <Suspense fallback={<PageLoader />}>
            <DataPage />
          </Suspense>
        )} 
      />

      {/* === LEGACY REDIRECTS === */}
      <Route path="/leads">
        <LegacyRedirect to="/contacts" transform={{ stage: "lead" }} />
      </Route>

      <Route path="/customers">
        <LegacyRedirect to="/contacts" transform={{ stage: "customer" }} />
      </Route>

      <Route path="/unified-segments">
        <LegacyRedirect to="/contacts/segments" />
      </Route>

      <Route path="/journey">
        <LegacyRedirect to="/journeys" />
      </Route>

      <Route path="/customer-journey">
        <LegacyRedirect to="/journeys" />
      </Route>

      <Route path="/email/campaigns">
        <LegacyRedirect to="/campaigns" />
      </Route>

      <Route path="/data-mgmt">
        <LegacyRedirect to="/data" />
      </Route>

      <Route path="/data-consistency">
        <LegacyRedirect to="/data/quality" />
      </Route>

      {/* === EXISTING ROUTES === */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/campaigns" component={Campaigns} />
      <ProtectedRoute path="/analytics" component={Analytics} />
      <ProtectedRoute path="/lead-management" component={LeadManagement} />
      <ProtectedRoute path="/customer-data" component={CustomerData} />
      <ProtectedRoute path="/email" component={EmailManagement} />
      <ProtectedRoute path="/scheduled-emails" component={ScheduledEmails} />
      <ProtectedRoute path="/email-delivery" component={EmailDeliveryStatus} />
      <ProtectedRoute path="/calendar" component={CalendarManagement} />
      <ProtectedRoute path="/marketing-forms" component={MarketingForms} />
      
      {/* Tracking settings integrated into Settings page */}
      <Route path="/tracking-settings" component={TrackingSettings} />
      
      {/* Campaign detail route */}
      <ProtectedRoute path="/campaigns/:id" component={CampaignDetail} />
      
      {/* Settings page */}
      <ProtectedRoute path="/settings" component={SettingsPage} />
      
      {/* Admin pages */}
      <ProtectedRoute path="/admin/notifications" component={SystemNotifications} />
      <ProtectedRoute path="/admin/feedback" component={FeedbackList} />
      <ProtectedRoute path="/admin/simple-feedback" component={SimpleFeedback} />
      
      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/features" component={Features} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/contact" component={Contact} />
      <Route path="/demo" component={Demo} />
      
      <Route component={NotFound} />
    </Switch>
  );
}