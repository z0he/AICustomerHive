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
  Clock
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import EmailTemplateCard from '@/components/email/EmailTemplateCard';
import EmailCampaignIntegration from '@/components/email/EmailCampaignIntegration';
import EmailAnalytics from '@/components/email/EmailAnalytics';
import EmailSequenceManager from '@/components/email/EmailSequenceManager';
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
  variables: z.string().transform(val => 
    val ? val.split(',').map(v => v.trim()) : []
  ),
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

const EmailManagement: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('configuration');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  // API status query
  const { data: apiStatus, isLoading: isStatusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/config/mailgun/status'],
    refetchOnWindowFocus: false,
  });

  // Email templates query
  const { 
    data: emailTemplates, 
    isLoading: isTemplatesLoading, 
    error: templatesError,
    refetch: refetchTemplates
  } = useQuery({
    queryKey: ['/api/email/templates'],
    enabled: activeTab === 'templates',
  });

  // Email logs query
  const { 
    data: emailLogs, 
    isLoading: isLogsLoading, 
    error: logsError,
    refetch: refetchLogs
  } = useQuery({
    queryKey: ['/api/email/logs'],
    enabled: activeTab === 'logs',
  });

  // Configure API key mutation
  const configureApiMutation = useMutation({
    mutationFn: async (data: ConfigureApiKeyFormData) => {
      const response = await fetch('/api/config/mailgun', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to configure API key');
      }
      
      return response.json();
    },
    onSuccess: () => {
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
    createTemplateMutation.mutate(data);
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
        return <Badge variant="success">Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Email Management</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="sequences">Sequences</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
                        Save Configuration
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2">
              <p className="text-sm text-muted-foreground">
                Your API key and domain are securely stored and never exposed to the client side.
              </p>
              <Alert variant="warning" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important Mailgun Information</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 text-sm space-y-1 mt-1">
                    <li>New Mailgun accounts require activation. Check your email for an activation link, or log in to the Mailgun dashboard to activate your account.</li>
                    <li>For sandbox domains, you must add authorized recipients in your Mailgun dashboard before you can send them emails.</li>
                    <li>Sandbox domains can only send to verified recipients that you've explicitly authorized.</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2" size={20} />
                    Email Templates
                  </CardTitle>
                  <CardDescription>
                    Manage your email templates for various scenarios.
                  </CardDescription>
                </div>
                <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Create New Email Template</DialogTitle>
                      <DialogDescription>
                        Create a reusable email template. Use {`{{variableName}}`} syntax to define placeholders.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...templateForm}>
                      <form onSubmit={templateForm.handleSubmit(onTemplateSubmit)} className="space-y-4">
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
                                defaultValue={field.value} 
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="general">General</SelectItem>
                                  <SelectItem value="welcome">Welcome</SelectItem>
                                  <SelectItem value="notification">Notification</SelectItem>
                                  <SelectItem value="marketing">Marketing</SelectItem>
                                  <SelectItem value="transactional">Transactional</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={templateForm.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subject</FormLabel>
                              <FormControl>
                                <Input placeholder="Welcome to Our Company!" {...field} />
                              </FormControl>
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
                                  placeholder="<h1>Hello John</h1><p>Welcome to our service!</p>" 
                                  className="min-h-[100px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                HTML version of your email. Use {`{{variableName}}`} for dynamic content.
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
                              <FormLabel>Text Content</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Hello John, Welcome to our service!" 
                                  className="min-h-[100px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Plain text version of your email for clients that don't support HTML.
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
                              <FormLabel>Variables</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="name, companyName, productName" 
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
                        <DialogFooter>
                          <Button
                            type="submit"
                            disabled={createTemplateMutation.isPending}
                          >
                            {createTemplateMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : "Create Template"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {isTemplatesLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading templates...</span>
                </div>
              ) : templatesError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load email templates. Please try again.
                  </AlertDescription>
                </Alert>
              ) : !emailTemplates?.length ? (
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
        </TabsContent>

        {/* Campaign Integration Tab */}
        <TabsContent value="campaigns" className="mt-4">
          <EmailCampaignIntegration />
        </TabsContent>

        {/* Sequences Tab */}
        <TabsContent value="sequences" className="mt-4">
          <EmailSequenceManager />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-4">
          <EmailAnalytics />
        </TabsContent>
        
        {/* Email Logs Tab */}
        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2" size={20} />
                    Email Logs
                  </CardTitle>
                  <CardDescription>
                    Track and monitor all sent emails and their status.
                  </CardDescription>
                </div>
                <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Email
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Send New Email</DialogTitle>
                      <DialogDescription>
                        Send a one-off email directly from the application.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...sendEmailForm}>
                      <form onSubmit={sendEmailForm.handleSubmit(onSendEmailSubmit)} className="space-y-4">
                        <FormField
                          control={sendEmailForm.control}
                          name="from"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>From</FormLabel>
                              <FormControl>
                                <Input placeholder="sender@yourdomain.com" {...field} />
                              </FormControl>
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
                                <Input placeholder="Your email subject" {...field} />
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
                              <FormLabel>Body</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Your email content" 
                                  className="min-h-[150px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button
                            type="submit"
                            disabled={sendEmailMutation.isPending || !apiStatus?.configured}
                          >
                            {sendEmailMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Send Email
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {isLogsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading email logs...</span>
                </div>
              ) : logsError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load email logs. Please try again.
                  </AlertDescription>
                </Alert>
              ) : !emailLogs?.length ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Email Logs</h3>
                  <p className="text-muted-foreground">
                    No emails have been sent yet. Start by sending your first email.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setSendDialogOpen(true)}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Your First Email
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell>{formatDate(log.sentAt)}</TableCell>
                          <TableCell>{log.to}</TableCell>
                          <TableCell>{log.subject}</TableCell>
                          <TableCell>
                            {log.templateId ? (
                              <Badge variant="outline">Template #{log.templateId}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Custom</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                onClick={() => refetchLogs()}
                disabled={isLogsLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLogsLoading ? "animate-spin" : ""}`} />
                Refresh Logs
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailManagement;
