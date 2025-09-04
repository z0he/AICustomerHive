import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { ProtectedRoute } from "@/lib/protected-route";
import { LegacyRedirect } from "@/components/LegacyRedirect";
import { useFlag } from "@/hooks/use-feature-flags";

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
import { UnderDevelopment } from "@/components/UnderDevelopment";

// Lazy-loaded pages for new IA (using existing components or fallbacks)
const ContactsPage = lazy(() => 
  import("@/pages/contacts/ContactsPage").then(module => ({
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
  import("@/pages/data/DataQualityPage").then(module => ({
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


// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0082AE]"></div>
  </div>
);

// Guard component for flag-based rendering
function Guard({ flag, children, offText }: { flag: string; children: React.ReactNode; offText: string }) {
  const on = useFlag(flag);
  return on ? <>{children}</> : <div className="p-4 text-sm text-gray-600">{offText}</div>;
}

export function AppRoutes({ user }: { user: any }) {
  // Feature flags are now handled by Guard component
  const websiteTrackingV2 = useFlag('ff.website_tracking_v2');

  return (
    <Switch>
      {/* Home route - shows Landing to non-authenticated users */}
      <Route path="/">
        {user ? <Dashboard /> : <Landing />}
      </Route>

      {/* === NEW IA ROUTES (ALWAYS REGISTERED, COMPONENT GUARDED) === */}
      <ProtectedRoute 
        path="/contacts" 
        component={() => (
          <Guard flag="ff.contacts_unified" offText="Contacts are disabled.">
            <Suspense fallback={<PageLoader />}>
              <ContactsPage />
            </Suspense>
          </Guard>
        )} 
      />

      <ProtectedRoute 
        path="/contacts/segments" 
        component={() => (
          <Guard flag="ff.unified_segments" offText="Segments are disabled.">
            <Suspense fallback={<PageLoader />}>
              <ContactsSegmentsPage />
            </Suspense>
          </Guard>
        )} 
      />

      <ProtectedRoute 
        path="/journeys" 
        component={() => (
          <Guard flag="ff.journey_unified" offText="Journeys are disabled.">
            <Suspense fallback={<PageLoader />}>
              <JourneysPage />
            </Suspense>
          </Guard>
        )} 
      />

      <ProtectedRoute 
        path="/automation/workflows" 
        component={() => (
          <Guard flag="ff.automation_unified" offText="Automation workflows are disabled.">
            <Suspense fallback={<PageLoader />}>
              <AutomationWorkflowsPage />
            </Suspense>
          </Guard>
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

      {websiteTrackingV2 && (
        <ProtectedRoute 
          path="/settings/integrations/tracking" 
          component={() => (
            <Suspense fallback={<PageLoader />}>
              <SettingsIntegrationsTrackingPage />
            </Suspense>
          )} 
        />
      )}

      <ProtectedRoute 
        path="/data" 
        component={() => (
          <Suspense fallback={<PageLoader />}>
            <DataPage />
          </Suspense>
        )} 
      />
      
      {/* New unified navigation routes */}
      <ProtectedRoute 
        path="/automation/workflows" 
        component={() => (
          <Guard flag="ff.automation_unified" offText="Automation is disabled.">
            <Suspense fallback={<PageLoader />}>
              <AutomationWorkflowsPage />
            </Suspense>
          </Guard>
        )} 
      />
      
      <ProtectedRoute 
        path="/automation/templates" 
        component={() => (
          <Guard flag="ff.automation_unified" offText="Automation is disabled.">
            <UnderDevelopment title="Automation Templates" />
          </Guard>
        )} 
      />
      
      <ProtectedRoute 
        path="/automation/logs" 
        component={() => (
          <Guard flag="ff.automation_unified" offText="Automation is disabled.">
            <UnderDevelopment title="Automation Execution Logs" />
          </Guard>
        )} 
      />
      
      <ProtectedRoute 
        path="/automation/analytics" 
        component={() => (
          <Guard flag="ff.automation_unified" offText="Automation is disabled.">
            <UnderDevelopment title="Automation Analytics" />
          </Guard>
        )} 
      />
      
      <ProtectedRoute 
        path="/email/templates" 
        component={() => (
          <Suspense fallback={<PageLoader />}>
            <EmailManagement />
          </Suspense>
        )} 
      />
      
      <ProtectedRoute 
        path="/email/campaigns" 
        component={() => (
          <Suspense fallback={<PageLoader />}>
            <EmailManagement />
          </Suspense>
        )} 
      />
      
      <ProtectedRoute 
        path="/email/sequences" 
        component={() => (
          <Suspense fallback={<PageLoader />}>
            <EmailManagement />
          </Suspense>
        )} 
      />
      
      <ProtectedRoute 
        path="/data/export" 
        component={() => (
          <Suspense fallback={<PageLoader />}>
            <CustomerData />
          </Suspense>
        )} 
      />
      
      <ProtectedRoute 
        path="/data/import" 
        component={() => (
          <Suspense fallback={<PageLoader />}>
            <CustomerData />
          </Suspense>
        )} 
      />
      
      <ProtectedRoute 
        path="/forms" 
        component={() => (
          <Suspense fallback={<PageLoader />}>
            <MarketingForms />
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
      
      <Route path="/email/deliverability">
        <LegacyRedirect to="/email-delivery" />
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