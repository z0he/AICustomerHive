import { Switch, Route, Redirect } from "wouter";
import { ProtectedRoute } from "@/lib/protected-route";
import { AppShell } from "@/app/AppShell";

// Main application pages mapped to their exact routes
import Dashboard from "@/pages/Dashboard";
import ContactsPage from "@/pages/contacts/ContactsPage";  // serves /contacts
import CustomerJourney from "@/pages/CustomerJourney";  // serves /journeys
import UnifiedSegments from "@/pages/UnifiedSegments";  // serves /segments
import Campaigns from "@/pages/Campaigns";
import CampaignDetail from "@/pages/CampaignDetail";
import AutomationPage from "@/pages/AutomationPage";  // serves /automation
import EmailManagement from "@/pages/EmailManagement";  // serves /email
import EmailDeliveryStatus from "@/pages/EmailDeliveryStatus";  // serves /email-delivery
import MarketingForms from "@/pages/MarketingForms";  // serves /marketing-forms
import CalendarManagement from "@/pages/CalendarManagement";  // serves /calendar
import CustomerData from "@/pages/CustomerData";  // serves /customer-data
import DataQualityPage from "@/pages/data/DataQualityPage";  // serves /data/quality
import Analytics from "@/pages/Analytics";
import SettingsPage from "@/pages/Settings";

// Public/auth pages
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Features from "@/pages/Features";
import Pricing from "@/pages/Pricing";
import Contact from "@/pages/Contact";
import Demo from "@/pages/Demo";

// Admin/utility pages
import SystemNotifications from "@/pages/SystemNotifications";
import FeedbackList from "@/pages/FeedbackList";
import SimpleFeedback from "@/pages/SimpleFeedback";
import ScheduledEmails from "@/pages/ScheduledEmails";

export function AppRoutes({ user }: { user: any }) {
  return (
    <Switch>
      {/* Public routes - no sidebar */}
      <Route path="/">
        {user ? <Redirect to="/dashboard" /> : <Landing />}
      </Route>
      <Route path="/auth" component={AuthPage} />
      <Route path="/features" component={Features} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/contact" component={Contact} />
      <Route path="/demo" component={Demo} />

      {/* All other routes use AppShell with sidebar */}
      <Route>
        <AppShell>
          <Switch>
            {/* Main application routes */}
            <ProtectedRoute path="/dashboard" component={Dashboard} />
            <ProtectedRoute path="/contacts" component={ContactsPage} />
            <ProtectedRoute path="/journeys" component={CustomerJourney} />
            <ProtectedRoute path="/segments" component={UnifiedSegments} />
            <ProtectedRoute path="/campaigns" component={Campaigns} />
            <ProtectedRoute path="/automation" component={AutomationPage} />
            <ProtectedRoute path="/email" component={EmailManagement} />
            <ProtectedRoute path="/email-delivery" component={EmailDeliveryStatus} />
            <ProtectedRoute path="/marketing-forms" component={MarketingForms} />
            <ProtectedRoute path="/calendar" component={CalendarManagement} />
            <ProtectedRoute path="/customer-data" component={CustomerData} />
            <ProtectedRoute path="/data/quality" component={DataQualityPage} />
            <ProtectedRoute path="/analytics" component={Analytics} />
            <ProtectedRoute path="/settings" component={SettingsPage} />

            {/* Campaign detail route */}
            <ProtectedRoute path="/campaigns/:id" component={CampaignDetail} />

            {/* Legacy redirects */}
            <Route path="/customers">
              <Redirect to="/contacts?stage=customer" />
            </Route>
            <Route path="/leads">
              <Redirect to="/contacts?stage=lead" />
            </Route>
            <Route path="/journey">
              <Redirect to="/journeys" />
            </Route>
            <Route path="/customer-journey">
              <Redirect to="/journeys" />
            </Route>
            <Route path="/lead-management">
              <Redirect to="/contacts?stage=lead" />
            </Route>
            <Route path="/customer-management">
              <Redirect to="/contacts?stage=customer" />
            </Route>
            <Route path="/contact-management">
              <Redirect to="/contacts" />
            </Route>
            <Route path="/email-management">
              <Redirect to="/email" />
            </Route>
            <Route path="/sequences">
              <Redirect to="/automation" />
            </Route>

            {/* Admin routes */}
            <ProtectedRoute path="/admin/notifications" component={SystemNotifications} />
            <ProtectedRoute path="/admin/feedback" component={FeedbackList} />
            <ProtectedRoute path="/admin/simple-feedback" component={SimpleFeedback} />
            <ProtectedRoute path="/scheduled-emails" component={ScheduledEmails} />

            {/* 404 fallback */}
            <Route component={NotFound} />
          </Switch>
        </AppShell>
      </Route>
    </Switch>
  );
}