import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Tracking Settings Redirect Component
 * 
 * This component redirects from the legacy /tracking-settings route to the new
 * integrated tracking tab under the settings page (/settings?tab=tracking).
 * 
 * This maintains backward compatibility for any existing links or bookmarks.
 */
const TrackingSettings = () => {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Redirect to the tracking tab in the settings page
    setLocation('/settings?tab=tracking');
  }, [setLocation]);
  
  // Render a simple loading screen while redirecting
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-lg text-slate-600 mb-2">Redirecting to Website Tracking settings...</p>
        <div className="w-8 h-8 border-4 border-t-primary border-slate-200 rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
};

export default TrackingSettings;