import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import AuthHeader from '@/components/auth/AuthHeader';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Copy, CheckCircle2, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { trackEvent } from '@/lib/analytics';

// Define types for tracking installations
interface TrackingInstallation {
  id: number;
  websiteUrl: string;
  installationDate: string;
  status: 'active' | 'inactive' | 'pending';
  trackingCode: string;
  lastPingAt?: string;
  settings?: Record<string, any>;
  owner?: number;
  notes?: string;
}

const TrackingSettings = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('code');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  
  // Query tracking installations
  const { 
    data: trackingInstallations = [] as TrackingInstallation[], 
    isLoading: isLoadingInstallations,
    refetch: refetchInstallations 
  } = useQuery<TrackingInstallation[]>({
    queryKey: ['/api/marketing/tracking/installations'],
  });
  
  // Generate tracking code mutation
  const generateTrackingCode = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/marketing/tracking/code', { 
        websiteUrl 
      });
    },
    onSuccess: async (response) => {
      // Track successful code generation in Google Analytics
      trackEvent('generate_tracking_code', 'tracking', websiteUrl);
      
      // Get the JSON response with the tracking code
      const data = await response.json();
      
      // Set the generated code to display in the UI
      if (data && data.trackingCode) {
        setGeneratedCode(data.trackingCode);
      }
      
      toast({
        title: 'Tracking code generated',
        description: 'Copy and paste the code into your website.',
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/tracking/installations'] });
    },
    onError: (error) => {
      // Track error in Google Analytics
      trackEvent('tracking_code_error', 'tracking', websiteUrl);
      
      toast({
        title: 'Error generating tracking code',
        description: 'Please try again with a valid website URL.',
        variant: 'destructive',
      });
    }
  });
  
  // Generate code for a website
  const handleGenerateCode = () => {
    if (!websiteUrl) {
      toast({
        title: 'Website URL required',
        description: 'Please enter a valid website URL.',
        variant: 'destructive',
      });
      return;
    }
    
    // Track attempt to generate tracking code
    trackEvent('tracking_code_generation_attempt', 'tracking');
    generateTrackingCode.mutate();
  };
  
  // Copy tracking code to clipboard
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    
    // Track code copy in Google Analytics
    trackEvent('copy_tracking_code', 'tracking', websiteUrl);
    
    toast({
      title: 'Copied to clipboard',
      description: 'The tracking code has been copied to your clipboard.',
    });
    
    setTimeout(() => setCopied(false), 2000);
  };

  // Use generated code if available, otherwise use the latest installation code
  const latestInstallation = trackingInstallations && trackingInstallations[0];
  
  // If we have a newly generated code, use that, otherwise fall back to the latest installation or a placeholder
  const displayTrackingCode = generatedCode || latestInstallation?.trackingCode || `
<!-- CRM Tracking Code -->
<script type="text/javascript">
  (function(w, d, s, tc) {
    let scriptTag = d.createElement(s);
    scriptTag.async = true;
    scriptTag.src = 'https://yourcrm.com/api/marketing/tracking/script.js';
    let firstScriptTag = d.getElementsByTagName(s)[0];
    firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag);
  })(window, document, 'script', 'TRACKING_CODE_HERE');
</script>
<!-- End CRM Tracking Code -->
`;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <AuthHeader />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Website Tracking</h1>
              <p className="text-muted-foreground">Manage website tracking and analytics</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                trackEvent('refresh_installations', 'tracking');
                refetchInstallations();
              }}
              disabled={isLoadingInstallations}
            >
              {isLoadingInstallations ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>

          <Tabs 
            defaultValue={activeTab} 
            onValueChange={(value) => {
              setActiveTab(value);
              trackEvent('tab_change', 'tracking', value);
            }}>
            <TabsList className="mb-4">
              <TabsTrigger value="code">Tracking Code</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Tracking</TabsTrigger>
              <TabsTrigger value="installations">Your Installations</TabsTrigger>
            </TabsList>

            <TabsContent value="code">
              <Card>
                <CardHeader>
                  <CardTitle>Tracking Code Installation</CardTitle>
                  <CardDescription>
                    Copy and paste this tracking code into every page of your site, just before the closing {`</body>`} tag.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="website-url">Website URL</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="website-url" 
                          placeholder="https://yourwebsite.com" 
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                        />
                        <Button 
                          onClick={handleGenerateCode}
                          disabled={generateTrackingCode.isPending}
                        >
                          {generateTrackingCode.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Generate Code
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Embed Code</Label>
                      <div className="relative">
                        <Textarea 
                          className="font-mono text-sm h-48"
                          value={trackingCode}
                          readOnly
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(trackingCode)}
                        >
                          {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced">
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Tracking Settings</CardTitle>
                  <CardDescription>
                    Configure additional tracking parameters and privacy settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="track-forms">Track Form Submissions</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically track all form submissions on your website
                        </p>
                      </div>
                      <Switch id="track-forms" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="track-clicks">Track Button Clicks</Label>
                        <p className="text-sm text-muted-foreground">
                          Track clicks on buttons and links
                        </p>
                      </div>
                      <Switch id="track-clicks" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="track-scroll">Track Scroll Depth</Label>
                        <p className="text-sm text-muted-foreground">
                          Measure how far users scroll down your pages
                        </p>
                      </div>
                      <Switch id="track-scroll" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="anonymize-ip">Anonymize IP Addresses</Label>
                        <p className="text-sm text-muted-foreground">
                          For privacy compliance (GDPR, CCPA)
                        </p>
                      </div>
                      <Switch id="anonymize-ip" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="consent-required">Require Cookie Consent</Label>
                        <p className="text-sm text-muted-foreground">
                          Only track users who have accepted cookies
                        </p>
                      </div>
                      <Switch id="consent-required" defaultChecked />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="excluded-paths">Excluded Paths</Label>
                      <p className="text-sm text-muted-foreground">
                        Enter paths to exclude from tracking (one per line)
                      </p>
                      <Textarea 
                        id="excluded-paths"
                        placeholder="/thank-you&#10;/admin&#10;/login"
                        className="font-mono text-sm"
                      />
                    </div>
                    
                    <Button 
                      className="w-full"
                      onClick={() => {
                        trackEvent('save_tracking_settings', 'tracking');
                        toast({
                          title: 'Settings saved',
                          description: 'Your tracking settings have been updated.',
                        });
                      }}
                    >
                      Save Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="installations">
              <Card>
                <CardHeader>
                  <CardTitle>Your Tracking Installations</CardTitle>
                  <CardDescription>
                    Manage and monitor your tracking code installations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingInstallations ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : !trackingInstallations || trackingInstallations.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No tracking installations found.</p>
                      <p className="text-sm mt-2">
                        Generate and install tracking code on your websites to see them here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {trackingInstallations.map((installation: any) => (
                        <div key={installation.id} className="border rounded-md p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{installation.websiteUrl}</h3>
                              <p className="text-sm text-muted-foreground">
                                Installed: {new Date(installation.installationDate).toLocaleDateString()}
                              </p>
                              <div className="flex items-center mt-2">
                                <span className={`inline-flex h-2 w-2 rounded-full mr-2 ${
                                  installation.status === 'active' ? 'bg-green-500' : 'bg-amber-500'
                                }`} />
                                <span className="text-sm">
                                  {installation.status === 'active' ? 'Active' : 'Pending'}
                                </span>
                              </div>
                            </div>
                            <div className="space-x-2">
                              <Button size="sm" variant="outline">
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Code
                              </Button>
                              <Button size="sm" variant="outline">
                                Test Connection
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default TrackingSettings;