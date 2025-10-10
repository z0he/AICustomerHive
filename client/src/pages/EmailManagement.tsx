import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Mail, 
  AlertCircle, 
  CheckCircle, 
  Plus, 
  Key, 
  Settings, 
  FileText, 
  Send,
  RefreshCw,
  UserPlus,
  History,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import EmailTemplateCard from '@/components/email/EmailTemplateCard';
import EmailCampaignIntegration from '@/components/email/EmailCampaignIntegration';
import { formatDistanceToNow } from 'date-fns';
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Form schemas
const configureApiKeySchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  domain: z.string().min(1, "Domain is required"),
});

const emailTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  subject: z.string().min(1, "Subject is required"),
  bodyHtml: z.string().min(1, "HTML content is required"),
  bodyText: z.string().min(1, "Text content is required"),
  category: z.string().optional(),
  variables: z.string().optional(),
});

const sendEmailSchema = z.object({
  from: z.string().email("Valid from email is required"),
  to: z.string().email("Valid to email is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
});

type ConfigureApiKeyFormData = z.infer<typeof configureApiKeySchema>;
type EmailTemplateFormData = z.infer<typeof emailTemplateSchema>;
type SendEmailFormData = z.infer<typeof sendEmailSchema>;

interface EmailLog {
  id: number;
  from?: string;
  to?: string;
  recipient?: string;
  subject?: string;
  status: string;
  sentAt?: string;
  type?: string;
  metadata?: {
    testEmail?: boolean;
    mailgunId?: string;
    originalSubject?: string;
    personalizationApplied?: boolean;
    error?: string;
  };
}

interface MailgunConfig {
  configured: boolean;
  domain?: string;
  isSandbox?: boolean;
}

const EmailManagement: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('configuration');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // API status query
  const { data: apiStatus, isLoading: isStatusLoading, refetch: refetchStatus } = useQuery<MailgunConfig>({
    queryKey: ['/api/config/mailgun/status'],
    refetchOnWindowFocus: false,
  });

  // Email templates query
  const { 
    data: emailTemplates = [], 
    isLoading: isTemplatesLoading, 
    error: templatesError,
    refetch: refetchTemplates
  } = useQuery<any[]>({
    queryKey: ['/api/email/templates'],
    enabled: activeTab === 'templates',
  });

  // Email logs query
  const { 
    data: emailLogs = [], 
    isLoading: isLogsLoading, 
    error: logsError,
    refetch: refetchLogs
  } = useQuery<EmailLog[]>({
    queryKey: ['/api/email/logs'],
    enabled: activeTab === 'logs',
    refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30 seconds if enabled
  });

  // Get user data for the header
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/user'],
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

  // Configure API key mutation
  const configureApiMutation = useMutation({
    mutationFn: async (data: ConfigureApiKeyFormData) => {
      const response = await apiRequest('/api/config/mailgun', 'POST', data);
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Save Mailgun config to localStorage for campaign emails
      const mailgunConfig = {
        apiKey: variables.apiKey,
        domain: variables.domain
      };
      localStorage.setItem('mailgun-config', JSON.stringify(mailgunConfig));
      
      toast({
        title: 'API Key Configured',
        description: 'Mailgun API key and domain have been successfully configured.',
      });
      refetchStatus();
    },
    onError: (error: Error) => {
      toast({
        title: 'Configuration Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create email template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: EmailTemplateFormData) => {
      const response = await fetch('/api/email/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create email template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Template Created',
        description: 'Email template has been successfully created.',
      });
      setTemplateDialogOpen(false);
      refetchTemplates();
    },
    onError: (error: Error) => {
      toast({
        title: 'Template Creation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: SendEmailFormData) => {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send email');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Email Sent',
        description: 'Your email has been sent successfully.',
      });
      setSendDialogOpen(false);
      refetchLogs();
    },
    onError: (error: Error) => {
      toast({
        title: 'Send Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Forms
  const apiKeyForm = useForm<ConfigureApiKeyFormData>({
    resolver: zodResolver(configureApiKeySchema),
    defaultValues: {
      apiKey: '',
      domain: '',
    },
  });
  
  const templateForm = useForm<EmailTemplateFormData>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      name: '',
      subject: '',
      bodyHtml: '',
      bodyText: '',
      category: 'general',
      variables: '',
    },
  });

  const sendEmailForm = useForm<SendEmailFormData>({
    resolver: zodResolver(sendEmailSchema),
    defaultValues: {
      from: '',
      to: '',
      subject: '',
      body: '',
    },
  });

  // Form submissions
  const onApiKeySubmit: SubmitHandler<ConfigureApiKeyFormData> = (data) => {
    configureApiMutation.mutate(data);
  };

  const onTemplateSubmit: SubmitHandler<EmailTemplateFormData> = (data) => {
    // Transform variables string to array before sending
    const templateData = {
      ...data,
      variables: data.variables ? data.variables.split(',').map(v => v.trim()) : []
    };
    createTemplateMutation.mutate(templateData as any);
  };

  const onSendEmailSubmit: SubmitHandler<SendEmailFormData> = (data) => {
    // Pre-sending notification
    toast({
      title: "Sending Email",
      description: "Your email is being processed...",
    });
    
    sendEmailMutation.mutate(data);
  };

  // Helpers
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  // Calculate email statistics
  const totalSent = emailLogs.filter((e) => e.status === 'sent').length || 0;
  const totalFailed = emailLogs.filter((e) => e.status === 'failed').length || 0;
  const successRate = emailLogs.length ? Math.round((totalSent / emailLogs.length) * 100) : 0;

  // Handle logout
  const handleLogout = () => {
    // Clear token and redirect to login
    localStorage.removeItem('auth_token');
    window.location.href = '/auth';
  };

  return (
    <div className="bg-slate-50 p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Email Management</h1>
        <p className="text-slate-500 mt-1">Create templates, send emails, and manage your email campaigns</p>
      </div>
      
      <div>
          <div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                <TabsTrigger value="logs">Email Logs</TabsTrigger>
              </TabsList>
              
              {/* Configuration Tab */}
              <TabsContent value="configuration" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="mr-2" size={20} />
                      Mailgun Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure your Mailgun API key and domain to enable email capabilities.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-2">Mailgun API Status</h3>
                      {isStatusLoading ? (
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Checking status...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          {apiStatus?.configured ? (
                            <>
                              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                              <span>Mailgun API is properly configured and ready to use. Your API key and domain have been securely stored.</span>
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
                            onClick={() => refetchStatus()}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {apiStatus?.configured && (
                      <div className="mb-6">
                        <Card className="border-dashed">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Send Test Email</CardTitle>
                            <CardDescription>
                              Test your email configuration by sending a test email
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Form {...sendEmailForm}>
                              <form onSubmit={sendEmailForm.handleSubmit(onSendEmailSubmit)} className="space-y-4">
                                <FormField
                                  control={sendEmailForm.control}
                                  name="from"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>From</FormLabel>
                                      <FormControl>
                                        <Input placeholder="postmaster@your-sandbox-domain.mailgun.org" {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        For sandbox domains, use <strong>postmaster@your-sandbox-domain.mailgun.org</strong> or another address with your sandbox domain.
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={sendEmailForm.control}
                                  name="to"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>To</FormLabel>
                                      <FormControl>
                                        <Input placeholder="recipient@example.com" {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        For sandbox domains, the recipient must be an authorized email address in your Mailgun account.
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={sendEmailForm.control}
                                  name="subject"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Subject</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Test Email from CRM" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={sendEmailForm.control}
                                  name="body"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Message</FormLabel>
                                      <FormControl>
                                        <Textarea 
                                          placeholder="This is a test email from the CRM system." 
                                          className="min-h-[100px]"
                                          {...field} 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button 
                                  type="submit" 
                                  disabled={sendEmailMutation.isPending}
                                >
                                  {sendEmailMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Sending...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="mr-2 h-4 w-4" />
                                      Send Test Email
                                    </>
                                  )}
                                </Button>
                              </form>
                            </Form>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                    
                    <Separator className="my-6" />
                    
                    <Form {...apiKeyForm}>
                      <form onSubmit={apiKeyForm.handleSubmit(onApiKeySubmit)} className="space-y-6">
                        <FormField
                          control={apiKeyForm.control}
                          name="apiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mailgun API Key</FormLabel>
                              <FormControl>
                                <div className="flex">
                                  <Input 
                                    placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxx" 
                                    type="password"
                                    {...field} 
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>
                                Provide your Mailgun API key to enable email sending capabilities.
                                <a 
                                  href="https://app.mailgun.com/app/account/security/api_keys" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary underline ml-1"
                                >
                                  Get your API key here
                                </a>
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={apiKeyForm.control}
                          name="domain"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mailgun Domain</FormLabel>
                              <FormControl>
                                <div className="flex">
                                  <Input 
                                    placeholder="mg.yourdomain.com" 
                                    {...field} 
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>
                                Enter your Mailgun domain. You can find this in your Mailgun dashboard.
                                <a 
                                  href="https://app.mailgun.com/app/domains" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary underline ml-1"
                                >
                                  View your domains
                                </a>
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          disabled={configureApiMutation.isPending}
                        >
                          {configureApiMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Configuring...
                            </>
                          ) : (
                            <>
                              <Key className="mr-2 h-4 w-4" />
                              Save API Configuration
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                  <CardFooter className="flex-col items-start gap-2">
                    <p className="text-sm text-muted-foreground">
                      Note: Your API key and domain are stored securely on the server.
                    </p>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              {/* Templates Tab */}
              <TabsContent value="templates" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <FileText className="mr-2" size={20} />
                        Email Templates
                      </CardTitle>
                      <CardDescription>
                        Create and manage reusable email templates for your campaigns
                      </CardDescription>
                    </div>
                    <Button onClick={() => setTemplateDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      New Template
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {isTemplatesLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : templatesError ? (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error loading templates</AlertTitle>
                        <AlertDescription>
                          There was an error loading your email templates. Please try again.
                        </AlertDescription>
                      </Alert>
                    ) : !emailTemplates.length ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No Email Templates</h3>
                        <p className="text-muted-foreground">
                          You haven't created any email templates yet.
                        </p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => setTemplateDialogOpen(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create Your First Template
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {emailTemplates.map((template: any) => (
                          <EmailTemplateCard 
                            key={template.id} 
                            template={template} 
                            onRefresh={refetchTemplates}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Template Creation Dialog */}
                <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Create Email Template</DialogTitle>
                      <DialogDescription>
                        Create a reusable email template for your campaigns and communications.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...templateForm}>
                      <form onSubmit={templateForm.handleSubmit(onTemplateSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={templateForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Template Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Welcome Email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={templateForm.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="welcome">Welcome</SelectItem>
                                    <SelectItem value="nurture">Nurture</SelectItem>
                                    <SelectItem value="promotional">Promotional</SelectItem>
                                    <SelectItem value="follow-up">Follow-up</SelectItem>
                                    <SelectItem value="transactional">Transactional</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={templateForm.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subject Line</FormLabel>
                              <FormControl>
                                <Input placeholder="Welcome to our platform!" {...field} />
                              </FormControl>
                              <FormDescription>
                                The subject line of the email.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={templateForm.control}
                          name="variables"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Template Variables</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="firstName, lastName, company" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Comma-separated list of variables used in this template.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={templateForm.control}
                          name="bodyHtml"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>HTML Content</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="<p>Hello {{firstName}},</p><p>Welcome to our platform!</p>" 
                                  className="min-h-[150px] font-mono"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                HTML content of the email. Use {"{"}{"{"}"variableName"{"}"}{" }"} for dynamic content.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={templateForm.control}
                          name="bodyText"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plain Text Content</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Hello {{firstName}}, Welcome to our platform!" 
                                  className="min-h-[100px] font-mono"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Plain text version of the email for clients that don't support HTML.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setTemplateDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit"
                            disabled={createTemplateMutation.isPending}
                          >
                            {createTemplateMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Template
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </TabsContent>
              
              {/* Campaigns Tab */}
              <TabsContent value="campaigns" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Send className="mr-2" size={20} />
                      Email Campaigns
                    </CardTitle>
                    <CardDescription>
                      Use email templates in your marketing campaigns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EmailCampaignIntegration />
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Email Logs Tab */}
              <TabsContent value="logs" className="mt-4 space-y-6">
                {/* Mailgun Configuration Alert */}
                {apiStatus?.configured && apiStatus.domain?.includes('sandbox') && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      <strong>Sandbox Domain Detected:</strong> You're using a Mailgun sandbox domain ({apiStatus.domain}). 
                      Emails are sent to Mailgun but only delivered to authorized recipients. To send to any email address, 
                      you need to either add recipients to your authorized list in Mailgun or upgrade to a paid account.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Emails Sent</CardTitle>
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalSent}</div>
                      <p className="text-xs text-muted-foreground">Successfully sent to Mailgun</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Failed Emails</CardTitle>
                      <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalFailed}</div>
                      <p className="text-xs text-muted-foreground">Failed to send</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{successRate}%</div>
                      <p className="text-xs text-muted-foreground">Of all attempted emails</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Email Logs Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          <History className="mr-2" size={20} />
                          Email Logs
                        </CardTitle>
                        <CardDescription>
                          View all sent emails and their delivery status
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="auto-refresh" className="text-sm">Auto-refresh</Label>
                        <Switch
                          id="auto-refresh"
                          checked={autoRefresh}
                          onCheckedChange={setAutoRefresh}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLogsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : logsError ? (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error loading email logs</AlertTitle>
                        <AlertDescription>
                          There was an error loading your email logs. Please try again.
                        </AlertDescription>
                      </Alert>
                    ) : !emailLogs.length ? (
                      <div className="text-center py-8">
                        <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No Email Logs</h3>
                        <p className="text-muted-foreground">
                          No emails have been sent yet. Send your first email to see logs here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {emailLogs.map((log: any) => (
                          <div key={log.id} className="border rounded-lg">
                            <div 
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
                              onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                              data-testid={`email-log-${log.id}`}
                            >
                              <div className="flex items-start space-x-3 flex-1">
                                {getStatusIcon(log.status)}
                                <div className="space-y-1 flex-1">
                                  <div className="font-medium">{log.subject || 'No subject'}</div>
                                  <div className="text-sm text-muted-foreground">
                                    To: {log.to || log.recipient || 'N/A'} • From: {log.from || 'N/A'}
                                  </div>
                                  {log.metadata?.error && expandedLogId !== log.id && (
                                    <div className="text-sm text-red-600">
                                      Error: {log.metadata.error.substring(0, 50)}...
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                {getStatusBadge(log.status)}
                                <div className="text-sm text-muted-foreground min-w-[100px] text-right">
                                  {log.sentAt ? formatDistanceToNow(new Date(log.sentAt), { addSuffix: true }) : 'N/A'}
                                </div>
                                {expandedLogId === log.id ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                            
                            {/* Expanded Details */}
                            {expandedLogId === log.id && (
                              <div className="px-4 pb-4 border-t bg-slate-50 space-y-3">
                                <div className="grid grid-cols-2 gap-4 pt-3">
                                  <div>
                                    <div className="text-xs font-medium text-muted-foreground">Type</div>
                                    <div className="text-sm">{log.type || 'direct'}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs font-medium text-muted-foreground">Sent At</div>
                                    <div className="text-sm">{log.sentAt ? formatDate(log.sentAt) : 'N/A'}</div>
                                  </div>
                                  {log.metadata?.mailgunId && (
                                    <div className="col-span-2">
                                      <div className="text-xs font-medium text-muted-foreground">Mailgun ID</div>
                                      <div className="text-sm font-mono text-xs">{log.metadata.mailgunId}</div>
                                    </div>
                                  )}
                                  {log.metadata?.personalizationApplied && (
                                    <div>
                                      <div className="text-xs font-medium text-muted-foreground">Personalization</div>
                                      <div className="text-sm">Applied</div>
                                    </div>
                                  )}
                                </div>
                                {log.metadata?.error && (
                                  <div className="bg-red-50 border border-red-200 rounded p-3">
                                    <div className="text-xs font-medium text-red-800 mb-1">Error Details</div>
                                    <div className="text-sm text-red-600">{log.metadata.error}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Help Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Need Help with Email Delivery?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">If emails aren't reaching your inbox:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Check your spam/junk folder</li>
                        <li>Verify the recipient email is added to your Mailgun authorized recipients</li>
                        <li>Consider upgrading from a sandbox to a verified Mailgun domain</li>
                        <li>Check Mailgun logs in your Mailgun dashboard for delivery details</li>
                      </ul>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Mailgun Domain Status:</h4>
                      <div className="text-sm">
                        {apiStatus?.domain ? (
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                            {apiStatus.domain}
                            {apiStatus.domain.includes('sandbox') && (
                              <Badge variant="outline" className="ml-2 text-xs">Sandbox</Badge>
                            )}
                          </span>
                        ) : (
                          <span className="text-red-600">Not configured</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
            </Tabs>
        </div>
      </div>
    </div>
  );
};

export default EmailManagement;