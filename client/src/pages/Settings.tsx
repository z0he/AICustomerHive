import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';

// UI Components
import AuthHeader from '@/components/auth/AuthHeader';
import Sidebar from '@/components/layout/Sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
} from 'lucide-react';

// Form schemas
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

const SettingsPage: React.FC = () => {
  // Get URL parameters to check for 'tab' parameter
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      return tabParam && ['profile', 'notifications', 'integrations', 'tracking', 'appearance'].includes(tabParam)
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
    }
  }, [userData, profileForm]);

  // Set default notification form values when notification data is loaded
  useEffect(() => {
    if (notificationSettings) {
      notificationForm.reset(notificationSettings);
    }
  }, [notificationSettings, notificationForm]);

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
    onSuccess: () => {
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
    <div className="bg-slate-50 text-slate-800 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <AuthHeader 
        user={userData?.user || { id: 1, name: "User", initials: "U" }} 
        notifications={notifications} 
        onLogout={handleLogout} 
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar recentCampaigns={recentCampaigns} />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4">
          <div className="container mx-auto py-4 max-w-5xl">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Settings className="h-8 w-8 text-primary" />
              Settings
            </h1>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
              <TabsList className="grid w-full grid-cols-5">
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
                <TabsTrigger value="appearance">
                  <div className="flex items-center">
                    <Layout className="h-4 w-4 mr-2" />
                    <span>Appearance</span>
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
                      Configure your OpenAI API key to enable AI features
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-2">API Status</h3>
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
                    
                    <Form {...openAIForm}>
                      <form onSubmit={openAIForm.handleSubmit(onOpenAISubmit)} className="space-y-4">
                        <FormField
                          control={openAIForm.control}
                          name="apiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>OpenAI API Key</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="sk-..." {...field} />
                              </FormControl>
                              <FormDescription>
                                Your API key is securely stored and never shared with third parties
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
                      Configure your Mailgun API key to enable email capabilities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-2">API Status</h3>
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
                    
                    <Form {...mailgunForm}>
                      <form onSubmit={mailgunForm.handleSubmit(onMailgunSubmit)} className="space-y-4">
                        <FormField
                          control={mailgunForm.control}
                          name="apiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mailgun API Key</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="key-..." {...field} />
                              </FormControl>
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
                                <Input placeholder="mg.yourdomain.com" {...field} />
                              </FormControl>
                              <FormDescription>
                                For sandbox accounts, use your sandbox domain (e.g., sandbox123.mailgun.org)
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
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;