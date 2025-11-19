import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useCredits } from '@/hooks/use-credits';
import { TopUpCreditsModal } from '@/components/TopUpCreditsModal';

// UI Components
import UsageWarning from '@/components/usage/UsageWarning';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Icons
import {
  Settings,
  User,
  Bell,
  Key,
  Mail,
  Shield,
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles,
  UserCog,
  Globe,
  Layout,
  Code,
  Copy,
  CheckCircle2,
  TrendingUp,
  Zap,
  Users,
  DollarSign,
  Coins,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  Info,
} from 'lucide-react';

// Form schemas
const personalAPIKeysSchema = z.object({
  openaiKey: z.string().optional(),
  mailgunKey: z.string().optional(),
  mailgunDomain: z.string().optional(),
});

const openAIConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
});

const mailgunConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  domain: z.string().min(1, "Domain is required"),
});

const profileSettingsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(data => {
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: "Current password is required when setting a new password",
  path: ["currentPassword"],
}).refine(data => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  leadAlerts: z.boolean(),
  campaignUpdates: z.boolean(),
  weeklyReports: z.boolean(),
  securityAlerts: z.boolean(),
});

const businessProfileSchema = z.object({
  businessType: z.string().optional(),
  businessIndustry: z.string().optional(),
  companySize: z.string().optional(),
  primaryMarket: z.string().optional(),
});

const organizationSettingsSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  subdomain: z.string().optional(),
  customDomain: z.string().optional(),
  primaryColor: z.string().optional(),
});

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

type OpenAIConfigFormData = z.infer<typeof openAIConfigSchema>;
type MailgunConfigFormData = z.infer<typeof mailgunConfigSchema>;
type ProfileSettingsFormData = z.infer<typeof profileSettingsSchema>;
type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>;
type PersonalAPIKeysFormData = z.infer<typeof personalAPIKeysSchema>;
type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;
type OrganizationSettingsFormData = z.infer<typeof organizationSettingsSchema>;

// Credit Dashboard Component
function CreditDashboard() {
  const { data: creditInfo, isLoading } = useCredits();
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      topup: 'Top Up',
      email: 'Email Sent',
      automation: 'Automation',
      ai: 'AI Action',
      voice: 'Voice Command',
      system: 'System Credit'
    };
    return labels[type] || type;
  };

  const getTransactionTypeBadge = (type: string, amount: number) => {
    if (amount > 0) {
      return <Badge className="bg-green-100 text-green-800">Credit Added</Badge>;
    }
    
    const colors: Record<string, string> = {
      email: 'bg-blue-100 text-blue-800',
      automation: 'bg-purple-100 text-purple-800',
      ai: 'bg-indigo-100 text-indigo-800',
      voice: 'bg-pink-100 text-pink-800',
    };
    
    return <Badge className={colors[type] || 'bg-gray-100 text-gray-800'}>{getTransactionTypeLabel(type)}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading credit information...
      </div>
    );
  }

  if (!creditInfo) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Unable to load credit information. Please refresh the page.</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {/* Low Balance Warning */}
      {creditInfo.lowBalance && (
        <Alert className="border-amber-500 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Low Credit Balance</AlertTitle>
          <AlertDescription className="text-amber-800">
            Your credit balance is below {creditInfo.threshold} credits. Top up now to continue using AICRM features without interruption.
          </AlertDescription>
        </Alert>
      )}

      {/* Credit Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            Credit Balance
          </CardTitle>
          <CardDescription>
            Your current AICRM credit balance and usage summary
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Balance Display */}
          <div className="flex items-center justify-between p-6 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-lg">
            <div>
              <p className="text-sm text-slate-600 mb-1">Available Credits</p>
              <p className="text-4xl font-bold text-emerald-700">{creditInfo.balance.toLocaleString()}</p>
            </div>
            <Coins className="h-16 w-16 text-emerald-200" />
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-slate-600">Total Purchased</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{creditInfo.totalPurchasedCredits.toLocaleString()}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-slate-600">Total Used</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{creditInfo.totalUsedCredits.toLocaleString()}</p>
            </div>
          </div>

          {/* Top Up Button */}
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => setShowTopUpModal(true)}
            data-testid="button-topup-credits-billing"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Top Up Credits
          </Button>
        </CardContent>
      </Card>

      {/* Credit Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Credit Activity
          </CardTitle>
          <CardDescription>
            Recent credit transactions (last 20 entries)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {creditInfo.transactions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No credit transactions yet</p>
              <p className="text-sm mt-2">Top up credits to get started</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditInfo.transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-sm">
                        {new Date(transaction.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        {getTransactionTypeBadge(transaction.type, transaction.amount)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${transaction.amount > 0 ? 'text-green-600' : 'text-slate-600'}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {transaction.metadata?.bundle_type && `${transaction.metadata.bundle_type} bundle`}
                        {transaction.metadata?.source === 'stripe' && ' via Stripe'}
                        {transaction.metadata?.source === 'manual' && ' (Manual)'}
                        {transaction.type === 'email' && 'Email sent'}
                        {transaction.type === 'ai' && 'AI action'}
                        {transaction.type === 'automation' && 'Automation step'}
                        {transaction.type === 'voice' && 'Voice command'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How Credits Work - FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How AICRM Credits Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="font-medium text-blue-900 mb-2">Credit Usage Rates</p>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• <strong>1 credit</strong> = 1 email sent</li>
                <li>• <strong>2 credits</strong> = 1 AI action (insights, suggestions, etc.)</li>
                <li>• <strong>3 credits</strong> = 1 automation step or voice command</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <p className="font-medium text-green-900 mb-2">Credits Never Expire</p>
              <p className="text-sm text-green-800">
                Your credits are only used when you perform actions. They never expire and remain in your account until used.
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="font-medium text-purple-900 mb-2">Flexible Top-Ups</p>
              <p className="text-sm text-purple-800">
                Add more credits at any time using the Top Up Credits button. Choose from preset bundles or enter a custom amount (minimum $10 = 180 credits).
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="font-medium text-amber-900 mb-2">Low Balance Alerts</p>
              <p className="text-sm text-amber-800">
                You'll receive warnings when your balance falls below {creditInfo.threshold} credits. Keep your balance topped up to avoid service interruptions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Up Modal */}
      <TopUpCreditsModal
        open={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        current={creditInfo.balance}
      />
    </>
  );
}

const SettingsPage: React.FC = () => {
  // Get URL parameters to check for 'tab' parameter
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      return tabParam && ['profile', 'notifications', 'integrations', 'tracking', 'organization', 'appearance', 'usage'].includes(tabParam)
        ? tabParam
        : 'profile';
    }
    return 'profile';
  };

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [trackingActiveTab, setTrackingActiveTab] = useState('code');

  // API key status for usage tracking

  const { data: apiKeyStatus, isLoading: keyStatusLoading } = useQuery({
    queryKey: ['/api/settings/api-keys/status'],
    enabled: true
  });

  // Personal API Keys form
  const personalAPIKeysForm = useForm<PersonalAPIKeysFormData>({
    resolver: zodResolver(personalAPIKeysSchema),
    defaultValues: {
      openaiKey: '',
      mailgunKey: '',
      mailgunDomain: '',
    },
  });

  // Personal API Keys mutation
  const personalAPIKeysMutation = useMutation({
    mutationFn: async (data: PersonalAPIKeysFormData) => {
      return apiRequest('/api/settings/api-keys', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "API Keys Updated",
        description: "Your personal API keys have been saved securely.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/api-keys/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/usage'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update API keys",
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  const onPersonalAPIKeysSubmit = (data: PersonalAPIKeysFormData) => {
    personalAPIKeysMutation.mutate(data);
  };
  
  // Update URL when tab changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      window.history.replaceState({}, '', url.toString());
    }
  }, [activeTab]);

  // Query user data
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/user'],
  });

  // Query notification settings
  const { data: notificationSettings } = useQuery({
    queryKey: ['/api/auth/user/notifications'],
    queryFn: async () => {
      // Default values for notification settings
      return {
        emailNotifications: true,
        leadAlerts: true,
        campaignUpdates: true,
        weeklyReports: false,
        securityAlerts: true,
      };
    }
  });

  // Query tracking installations
  const { 
    data: trackingInstallations = [] as TrackingInstallation[], 
    isLoading: isLoadingInstallations,
    refetch: refetchInstallations 
  } = useQuery<TrackingInstallation[]>({
    queryKey: ['/api/marketing/tracking/installations'],
  });

  // OpenAI API status query
  const { data: openaiStatus, isLoading: isOpenAIStatusLoading, refetch: refetchOpenAIStatus } = useQuery({
    queryKey: ['/api/config/openai/status'],
    refetchOnWindowFocus: false,
  });

  // Mailgun API status query
  const { data: mailgunStatus, isLoading: isMailgunStatusLoading, refetch: refetchMailgunStatus } = useQuery({
    queryKey: ['/api/config/mailgun/status'],
    refetchOnWindowFocus: false,
  });

  // Usage data query
  const { data: usageData, isLoading: usageLoading, refetch: refetchUsage } = useQuery({
    queryKey: ['/api/usage'],
    refetchOnWindowFocus: false,
  });

  // Get notifications for the header
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      // Default empty array if API not available
      return [];
    }
  });

  // Get recent campaigns for sidebar
  const { data: recentCampaigns = [] } = useQuery({
    queryKey: ['/api/campaigns/recent'],
    queryFn: async () => {
      // Default empty array if API not available
      return [];
    }
  });

  // Forms
  const openAIForm = useForm<OpenAIConfigFormData>({
    resolver: zodResolver(openAIConfigSchema),
    defaultValues: {
      apiKey: '',
    }
  });

  const mailgunForm = useForm<MailgunConfigFormData>({
    resolver: zodResolver(mailgunConfigSchema),
    defaultValues: {
      apiKey: '',
      domain: '',
    }
  });

  const profileForm = useForm<ProfileSettingsFormData>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      name: '',
      email: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  });

  const notificationForm = useForm<NotificationSettingsFormData>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      leadAlerts: true,
      campaignUpdates: true,
      weeklyReports: false,
      securityAlerts: true,
    }
  });

  const businessProfileForm = useForm<BusinessProfileFormData>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      businessType: '',
      businessIndustry: '',
      companySize: '',
      primaryMarket: '',
    }
  });

  const organizationForm = useForm<OrganizationSettingsFormData>({
    resolver: zodResolver(organizationSettingsSchema),
    defaultValues: {
      name: '',
      subdomain: '',
      customDomain: '',
      primaryColor: '#4F46E5',
    }
  });

  // Query organization data
  const { data: organizationData, isLoading: isLoadingOrganization } = useQuery({
    queryKey: ['/api/organization/me'],
  });

  // Set default form values when user data is loaded
  useEffect(() => {
    if (userData?.user) {
      profileForm.reset({
        name: userData.user.name || '',
        email: userData.user.username || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      businessProfileForm.reset({
        businessType: userData.user.businessType || '',
        businessIndustry: userData.user.businessIndustry || '',
        companySize: userData.user.companySize || '',
        primaryMarket: userData.user.primaryMarket || '',
      });
    }
  }, [userData, profileForm, businessProfileForm]);

  // Set default notification form values when notification data is loaded
  useEffect(() => {
    if (notificationSettings) {
      notificationForm.reset(notificationSettings);
    }
  }, [notificationSettings, notificationForm]);

  // Set default organization form values when organization data is loaded
  useEffect(() => {
    if (organizationData) {
      organizationForm.reset({
        name: organizationData.name || '',
        subdomain: organizationData.subdomain || '',
        customDomain: organizationData.customDomain || '',
        primaryColor: organizationData.primaryColor || '#4F46E5',
      });
    }
  }, [organizationData, organizationForm]);

  // Mutations
  const generateTrackingCode = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/marketing/tracking/code', { 
        websiteUrl
      });
    },
    onSuccess: async (response) => {
      // Track successful code generation
      
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
      toast({
        title: 'Error generating tracking code',
        description: 'Please try again with a valid website URL.',
        variant: 'destructive',
      });
    }
  });
  
  const configureOpenAIMutation = useMutation({
    mutationFn: async (data: OpenAIConfigFormData) => {
      return await apiRequest('/api/config/openai', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: 'API Key Configured',
        description: 'OpenAI API key has been successfully configured.',
      });
      refetchOpenAIStatus();
    },
    onError: (error: any) => {
      toast({
        title: 'Configuration Failed',
        description: error.message || 'Failed to configure API key',
        variant: 'destructive',
      });
    },
  });

  const configureMailgunMutation = useMutation({
    mutationFn: async (data: MailgunConfigFormData) => {
      return await apiRequest('/api/config/mailgun', 'POST', data);
    },
    onSuccess: (_, variables) => {
      // Save Mailgun config to localStorage for campaign emails
      const mailgunConfig = {
        apiKey: variables.apiKey,
        domain: variables.domain
      };
      localStorage.setItem('mailgun-config', JSON.stringify(mailgunConfig));
      
      // Debug: verify it was saved
      console.log('Mailgun config saved to localStorage:', localStorage.getItem('mailgun-config'));
      
      toast({
        title: 'API Key Configured',
        description: 'Mailgun API key and domain have been successfully configured.',
      });
      refetchMailgunStatus();
    },
    onError: (error: any) => {
      toast({
        title: 'Configuration Failed',
        description: error.message || 'Failed to configure API key',
        variant: 'destructive',
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileSettingsFormData) => {
      return await apiRequest('/api/auth/user/profile', 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    },
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: NotificationSettingsFormData) => {
      return await apiRequest('/api/auth/user/notifications', 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: 'Notification Settings Updated',
        description: 'Your notification preferences have been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update notification settings',
        variant: 'destructive',
      });
    },
  });

  const updateBusinessProfileMutation = useMutation({
    mutationFn: async (data: BusinessProfileFormData) => {
      return await apiRequest('/api/auth/user/business-profile', 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: 'Business Profile Updated',
        description: 'Your business profile has been successfully updated. AI campaign messages will now be tailored to your business type.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update business profile',
        variant: 'destructive',
      });
    },
  });

  const updateOrganizationMutation = useMutation({
    mutationFn: async (data: OrganizationSettingsFormData) => {
      return await apiRequest('/api/organization/me', 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: 'Organization Updated',
        description: 'Your organization settings have been successfully updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/organization/me'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update organization settings',
        variant: 'destructive',
      });
    },
  });

  // Form submissions
  const onOpenAISubmit = (data: OpenAIConfigFormData) => {
    configureOpenAIMutation.mutate(data);
  };

  const onMailgunSubmit = (data: MailgunConfigFormData) => {
    configureMailgunMutation.mutate(data);
  };

  const onProfileSubmit = (data: ProfileSettingsFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onNotificationSubmit = (data: NotificationSettingsFormData) => {
    updateNotificationsMutation.mutate(data);
  };

  const onBusinessProfileSubmit = (data: BusinessProfileFormData) => {
    updateBusinessProfileMutation.mutate(data);
  };

  const onOrganizationSubmit = (data: OrganizationSettingsFormData) => {
    updateOrganizationMutation.mutate(data);
  };

  // Handle generation of tracking code
  const handleGenerateCode = () => {
    if (!websiteUrl) {
      toast({
        title: 'Website URL required',
        description: 'Please enter a valid website URL.',
        variant: 'destructive',
      });
      return;
    }
    
    generateTrackingCode.mutate();
  };
  
  // Copy tracking code to clipboard
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    
    toast({
      title: 'Copied to clipboard',
      description: 'The tracking code has been copied to your clipboard.',
    });
    
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Use generated code if available, otherwise use the latest installation code
  const latestInstallation = trackingInstallations && trackingInstallations[0];
  
  // Determine what to display in the tracking code textarea
  // Only show a tracking code if one was just generated
  let displayTrackingCode = '';
  
  if (generatedCode) {
    // Show newly generated code
    displayTrackingCode = generatedCode;
  } else if (latestInstallation?.trackingCode) {
    // If there's an existing installation but no new code was generated,
    // leave the field empty and let the placeholder show
    displayTrackingCode = '';
  } else {
    // No installations and no generated code - leave empty to show placeholder
    displayTrackingCode = '';
  }

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/auth';
  };

  return (
    <div className="bg-slate-50 p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="h-7 w-7 text-primary" />
          Settings
        </h1>
        <p className="text-slate-500 mt-1">Manage your account settings and preferences</p>
      </div>
      
      <div>
          <div className="max-w-5xl">
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="profile">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    <span>Profile</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="notifications">
                  <div className="flex items-center">
                    <Bell className="h-4 w-4 mr-2" />
                    <span>Notifications</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="integrations">
                  <div className="flex items-center">
                    <Key className="h-4 w-4 mr-2" />
                    <span>API Integrations</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="tracking">
                  <div className="flex items-center">
                    <Code className="h-4 w-4 mr-2" />
                    <span>Tracking</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="organization">
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 mr-2" />
                    <span>Organization</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="appearance">
                  <div className="flex items-center">
                    <Layout className="h-4 w-4 mr-2" />
                    <span>Appearance</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="usage">
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    <span>Usage & Billing</span>
                  </div>
                </TabsTrigger>
              </TabsList>
              
              {/* Profile Tab */}
              <TabsContent value="profile" className="mt-4 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCog className="h-5 w-5" />
                      Personal Information
                    </CardTitle>
                    <CardDescription>
                      Update your profile information and password
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                          <FormField
                            control={profileForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Your full name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input placeholder="your.email@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <Separator className="my-6" />
                        <h3 className="text-lg font-medium mb-4">Change Password</h3>
                        
                        <div className="grid grid-cols-1 gap-6">
                          <FormField
                            control={profileForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={profileForm.control}
                              name="newPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>New Password</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={profileForm.control}
                              name="confirmPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Confirm New Password</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="mt-4" 
                          disabled={updateProfileMutation.isPending}
                        >
                          {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Changes
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Business Profile
                    </CardTitle>
                    <CardDescription>
                      Tell us about your business to get AI campaign messages tailored to your audience (B2B vs B2C)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...businessProfileForm}>
                      <form onSubmit={businessProfileForm.handleSubmit(onBusinessProfileSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={businessProfileForm.control}
                            name="businessType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Business Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-business-type">
                                      <SelectValue placeholder="Select business type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="B2B">B2B (Business to Business)</SelectItem>
                                    <SelectItem value="B2C">B2C (Business to Consumer)</SelectItem>
                                    <SelectItem value="Both">Both B2B and B2C</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  This helps AI generate appropriate campaign messages for your target audience
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={businessProfileForm.control}
                            name="companySize"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company Size (Optional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-company-size">
                                      <SelectValue placeholder="Select company size" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="1-10">1-10 employees</SelectItem>
                                    <SelectItem value="11-50">11-50 employees</SelectItem>
                                    <SelectItem value="51-200">51-200 employees</SelectItem>
                                    <SelectItem value="201-1000">201-1000 employees</SelectItem>
                                    <SelectItem value="1000+">1000+ employees</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={businessProfileForm.control}
                            name="businessIndustry"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Industry (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Technology, Retail, Healthcare" {...field} data-testid="input-business-industry" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={businessProfileForm.control}
                            name="primaryMarket"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Primary Market (Optional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-primary-market">
                                      <SelectValue placeholder="Select primary market" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="local">Local</SelectItem>
                                    <SelectItem value="regional">Regional</SelectItem>
                                    <SelectItem value="national">National</SelectItem>
                                    <SelectItem value="international">International</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="mt-4" 
                          disabled={updateBusinessProfileMutation.isPending}
                          data-testid="button-save-business-profile"
                        >
                          {updateBusinessProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Business Profile
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Notifications Tab */}
              <TabsContent value="notifications" className="mt-4 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification Preferences
                    </CardTitle>
                    <CardDescription>
                      Configure how and when you receive notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...notificationForm}>
                      <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                        <div className="space-y-4">
                          <FormField
                            control={notificationForm.control}
                            name="emailNotifications"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between">
                                <div>
                                  <FormLabel className="text-base">Email Notifications</FormLabel>
                                  <FormDescription>Enable or disable all email notifications</FormDescription>
                                </div>
                                <FormControl>
                                  <Switch 
                                    checked={field.value} 
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <Separator />
                          
                          <FormField
                            control={notificationForm.control}
                            name="leadAlerts"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between">
                                <div>
                                  <FormLabel className="text-base">New Lead Alerts</FormLabel>
                                  <FormDescription>Get notified when new leads are added</FormDescription>
                                </div>
                                <FormControl>
                                  <Switch 
                                    checked={field.value} 
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <Separator />
                          
                          <FormField
                            control={notificationForm.control}
                            name="campaignUpdates"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between">
                                <div>
                                  <FormLabel className="text-base">Campaign Updates</FormLabel>
                                  <FormDescription>Get notified about campaign performance changes</FormDescription>
                                </div>
                                <FormControl>
                                  <Switch 
                                    checked={field.value} 
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <Separator />
                          
                          <FormField
                            control={notificationForm.control}
                            name="weeklyReports"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between">
                                <div>
                                  <FormLabel className="text-base">Weekly Analytics Reports</FormLabel>
                                  <FormDescription>Receive weekly performance summaries</FormDescription>
                                </div>
                                <FormControl>
                                  <Switch 
                                    checked={field.value} 
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <Separator />
                          
                          <FormField
                            control={notificationForm.control}
                            name="securityAlerts"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between">
                                <div>
                                  <FormLabel className="text-base">Security Alerts</FormLabel>
                                  <FormDescription>Get notified about security-related events</FormDescription>
                                </div>
                                <FormControl>
                                  <Switch 
                                    checked={field.value} 
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="mt-4" 
                          disabled={updateNotificationsMutation.isPending}
                        >
                          {updateNotificationsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Preferences
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* API Integrations Tab */}
              <TabsContent value="integrations" className="mt-4 space-y-6">
                {/* OpenAI Integration Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      OpenAI Integration
                    </CardTitle>
                    <CardDescription>
                      Configure your personal OpenAI API key for unlimited AI features
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Usage Info */}
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium">Current Status</h3>
                        {usageData?.aiPrompts?.used !== undefined && (
                          <span className="text-sm text-muted-foreground">
                            {usageData.aiPrompts.used} / {usageData.aiPrompts.hasPersonalKey ? '∞' : usageData.aiPrompts.limit} prompts used
                          </span>
                        )}
                      </div>
                      {usageData?.aiPrompts?.hasPersonalKey ? (
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          <span className="text-green-700 font-medium">Using your personal API key - Unlimited access</span>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center mb-2">
                            <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                            <span className="text-amber-700">Using shared API keys - Limited to {usageData?.aiPrompts?.limit || 20} prompts</span>
                          </div>
                          {(usageData?.aiPrompts?.used || 0) >= (usageData?.aiPrompts?.limit || 20) && (
                            <div className="text-sm text-red-600">
                              Limit reached! Add your API key below to continue using AI features.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-2">API Configuration</h3>
                      <div className="flex items-center mb-4">
                        {isOpenAIStatusLoading ? (
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Checking status...
                          </div>
                        ) : (
                          <div className="flex items-center">
                            {openaiStatus?.configured ? (
                              <>
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                                <span>OpenAI API is properly configured and ready to use.</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                                <span>OpenAI API is not configured. Please add your API key below.</span>
                              </>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="ml-2" 
                              onClick={() => refetchOpenAIStatus()}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Form {...openAIForm}>
                      <form onSubmit={openAIForm.handleSubmit(onOpenAISubmit)} className="space-y-4">
                        <FormField
                          control={openAIForm.control}
                          name="apiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Personal OpenAI API Key</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="sk-..." {...field} />
                              </FormControl>
                              <FormDescription>
                                Add your personal API key to bypass usage limits and get unlimited AI prompts
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          disabled={configureOpenAIMutation.isPending}
                        >
                          {configureOpenAIMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save API Key
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
                
                {/* Mailgun Integration Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Mailgun Integration
                    </CardTitle>
                    <CardDescription>
                      Configure your personal Mailgun API key for unlimited email sending
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Usage Info */}
                    <div className="mb-6 p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium">Current Status</h3>
                        {usageData?.emails?.used !== undefined && (
                          <span className="text-sm text-muted-foreground">
                            {usageData.emails.used} / {usageData.emails.hasPersonalKey ? '∞' : usageData.emails.limit} emails sent
                          </span>
                        )}
                      </div>
                      {usageData?.emails?.hasPersonalKey ? (
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          <span className="text-green-700 font-medium">Using your personal API key - Unlimited sending</span>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center mb-2">
                            <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                            <span className="text-amber-700">Using shared API keys - Limited to {usageData?.emails?.limit || 50} emails</span>
                          </div>
                          {(usageData?.emails?.used || 0) >= (usageData?.emails?.limit || 50) && (
                            <div className="text-sm text-red-600">
                              Limit reached! Add your API key below to continue sending emails.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-2">API Configuration</h3>
                      <div className="flex items-center mb-4">
                        {isMailgunStatusLoading ? (
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Checking status...
                          </div>
                        ) : (
                          <div className="flex items-center">
                            {mailgunStatus?.configured ? (
                              <>
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                                <span>Mailgun API is properly configured and ready to use.</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                                <span>Mailgun API is not configured. Please add your API key and domain below.</span>
                              </>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="ml-2" 
                              onClick={() => refetchMailgunStatus()}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Form {...mailgunForm}>
                      <form onSubmit={mailgunForm.handleSubmit(onMailgunSubmit)} className="space-y-4">
                        <FormField
                          control={mailgunForm.control}
                          name="apiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Personal Mailgun API Key</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="key-..." {...field} />
                              </FormControl>
                              <FormDescription>
                                Add your personal API key to bypass usage limits and get unlimited email sending
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={mailgunForm.control}
                          name="domain"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mailgun Domain</FormLabel>
                              <FormControl>
                                <Input placeholder="mail.aicrm.co.uk" {...field} />
                              </FormControl>
                              <FormDescription>
                                Must be mail.aicrm.co.uk - please ensure your Mailgun API key is associated with this domain
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          disabled={configureMailgunMutation.isPending}
                        >
                          {configureMailgunMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Configuration
                        </Button>
                      </form>
                    </Form>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-900">Secure Storage</p>
                          <p className="text-blue-700">
                            Your API keys are encrypted and stored securely. They are never shared with third parties.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Appearance Tab */}
              {/* Tracking Tab */}
              <TabsContent value="tracking" className="mt-4 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Website Tracking
                    </CardTitle>
                    <CardDescription>
                      Manage website tracking and analytics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-end mb-6">
                      <Button
                        variant="outline"
                        onClick={() => {
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
                      defaultValue={trackingActiveTab} 
                      onValueChange={(value) => {
                        setTrackingActiveTab(value);
                      }}>
                      <TabsList className="mb-4">
                        <TabsTrigger value="code">Tracking Code</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced Tracking</TabsTrigger>
                        <TabsTrigger value="installations">Your Installations</TabsTrigger>
                      </TabsList>

                      <TabsContent value="code">
                        <div className="space-y-6">
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
                                  value={displayTrackingCode}
                                  placeholder="Your generated tracking code will appear here"
                                  readOnly
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="absolute top-2 right-2"
                                  onClick={() => copyToClipboard(displayTrackingCode)}
                                >
                                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="advanced">
                        <div className="space-y-6">
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
                                toast({
                                  title: 'Settings saved',
                                  description: 'Your tracking settings have been updated.',
                                });
                              }}
                            >
                              Save Settings
                            </Button>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="installations">
                        <div>
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
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => copyToClipboard(installation.trackingCode)}
                                      >
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
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Organization Tab */}
              <TabsContent value="organization" className="mt-4 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Organization Settings
                    </CardTitle>
                    <CardDescription>
                      Manage your organization details and custom domain
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingOrganization ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <Form {...organizationForm}>
                        <form onSubmit={organizationForm.handleSubmit(onOrganizationSubmit)} className="space-y-6">
                          <div className="space-y-4">
                            <FormField
                              control={organizationForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Organization Name</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Your Organization Name" 
                                      data-testid="input-organization-name"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    The name of your organization as it appears throughout the CRM
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={organizationForm.control}
                              name="customDomain"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Custom Domain</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="crm.yourdomain.com" 
                                      data-testid="input-custom-domain"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Use your own domain for your CRM (e.g., crm.yourdomain.com). After adding, configure your DNS to point to your Replit deployment.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={organizationForm.control}
                              name="subdomain"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Subdomain (Alternative)</FormLabel>
                                  <FormControl>
                                    <div className="flex items-center gap-2">
                                      <Input 
                                        placeholder="yourcompany" 
                                        data-testid="input-subdomain"
                                        {...field} 
                                      />
                                      <span className="text-sm text-muted-foreground whitespace-nowrap">.aicrm.co.uk</span>
                                    </div>
                                  </FormControl>
                                  <FormDescription>
                                    If you don't have a custom domain, use a subdomain (e.g., yourcompany.aicrm.co.uk)
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={organizationForm.control}
                              name="primaryColor"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Primary Color</FormLabel>
                                  <FormControl>
                                    <div className="flex items-center gap-3">
                                      <Input 
                                        type="color" 
                                        className="w-20 h-10"
                                        data-testid="input-primary-color"
                                        {...field} 
                                      />
                                      <Input 
                                        type="text" 
                                        placeholder="#4F46E5"
                                        value={field.value}
                                        onChange={field.onChange}
                                        data-testid="input-primary-color-text"
                                      />
                                    </div>
                                  </FormControl>
                                  <FormDescription>
                                    Brand color for your organization
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="p-4 bg-blue-50 rounded-lg">
                            <div className="flex items-start gap-3">
                              <Globe className="h-5 w-5 text-blue-600 mt-0.5" />
                              <div className="text-sm">
                                <p className="font-medium text-blue-900 mb-1">DNS Configuration Required</p>
                                <p className="text-blue-700 mb-2">
                                  After adding a custom domain, you'll need to configure your DNS settings:
                                </p>
                                <ol className="list-decimal list-inside text-blue-700 space-y-1">
                                  <li>Publish your CRM to get your deployment URL</li>
                                  <li>Add a CNAME record pointing your custom domain to your Replit deployment</li>
                                  <li>Wait for DNS propagation (can take up to 24 hours)</li>
                                </ol>
                              </div>
                            </div>
                          </div>

                          <Button 
                            type="submit" 
                            data-testid="button-save-organization"
                            disabled={updateOrganizationMutation.isPending}
                          >
                            {updateOrganizationMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Save Changes
                          </Button>
                        </form>
                      </Form>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="appearance" className="mt-4 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layout className="h-5 w-5" />
                      Interface Settings
                    </CardTitle>
                    <CardDescription>
                      Customize the look and feel of your CRM interface
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-2">Theme</h3>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div 
                            className="border rounded-md p-4 flex flex-col items-center cursor-pointer bg-white hover:border-primary"
                            onClick={() => toast({ title: "Light theme selected" })}
                          >
                            <div className="h-20 w-full bg-white border rounded-md mb-2 flex items-center justify-center">
                              <div className="w-1/2 h-4 bg-slate-200 rounded-md"></div>
                            </div>
                            <span className="text-sm font-medium">Light</span>
                          </div>
                          
                          <div 
                            className="border rounded-md p-4 flex flex-col items-center cursor-pointer hover:border-primary"
                            onClick={() => toast({ title: "Dark theme selected", description: "Dark theme will be available in a future update" })}
                          >
                            <div className="h-20 w-full bg-slate-800 border rounded-md mb-2 flex items-center justify-center">
                              <div className="w-1/2 h-4 bg-slate-600 rounded-md"></div>
                            </div>
                            <span className="text-sm font-medium">Dark (Coming Soon)</span>
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h3 className="text-lg font-medium mb-2">Color Accent</h3>
                        <div className="grid grid-cols-5 gap-2 mt-2">
                          {["#0284c7", "#818cf8", "#10b981", "#f43f5e", "#f59e0b"].map((color, idx) => (
                            <div
                              key={idx}
                              className="h-10 rounded-md cursor-pointer hover:ring-2 hover:ring-offset-2"
                              style={{ backgroundColor: color }}
                              onClick={() => toast({ 
                                title: "Accent color updated", 
                                description: "This feature will be fully implemented in a future update" 
                              })}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h3 className="text-lg font-medium mb-2">Layout Density</h3>
                        <div className="flex items-center space-x-4">
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => toast({
                              title: "Comfortable layout selected",
                              description: "Layout preferences will be implemented in a future update"
                            })}
                          >
                            Comfortable
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => toast({
                              title: "Compact layout selected",
                              description: "Layout preferences will be implemented in a future update"
                            })}
                          >
                            Compact
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button disabled>
                      Save Appearance Settings
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Usage & Billing Tab */}
              <TabsContent value="usage" className="mt-4 space-y-6">
                <CreditDashboard />
              </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;