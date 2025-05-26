import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, Send, Link as LinkIcon, List, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { queryClient } from '@/lib/queryClient';

// Define form schemas
const campaignEmailSchema = z.object({
  campaignId: z.number().or(z.string().transform(val => parseInt(val, 10))),
  templateId: z.number().or(z.string().transform(val => parseInt(val, 10))),
  subject: z.string().optional(),
  segmentId: z.number().or(z.string().transform(val => parseInt(val, 10))).optional(),
  scheduledFor: z.string().optional(),
  testEmail: z.string().email().optional(),
});

type CampaignEmailFormData = z.infer<typeof campaignEmailSchema>;

const EmailCampaignIntegration = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [isNewEmailDialogOpen, setIsNewEmailDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Fetch campaigns
  const {
    data: campaigns = [],
    isLoading: isCampaignsLoading,
    error: campaignsError,
    refetch: refetchCampaigns,
  } = useQuery({
    queryKey: ['/api/campaigns'],
    enabled: activeTab === 'campaigns',
  });

  // Fetch email templates
  const {
    data: emailTemplates = [],
    isLoading: isTemplatesLoading,
    error: templatesError,
    refetch: refetchTemplates,
  } = useQuery({
    queryKey: ['/api/email/templates'],
    enabled: isNewEmailDialogOpen || activeTab === 'templates',
  });

  // Fetch customer segments
  const {
    data: segments = [],
    isLoading: isSegmentsLoading,
    error: segmentsError,
  } = useQuery({
    queryKey: ['/api/customers/segments'],
    enabled: isNewEmailDialogOpen,
  });

  // Fetch campaign emails
  const {
    data: campaignEmails = [],
    isLoading: isCampaignEmailsLoading,
    error: campaignEmailsError,
    refetch: refetchCampaignEmails,
  } = useQuery({
    queryKey: ['/api/campaigns/emails'],
    enabled: activeTab === 'scheduled',
  });

  // Form for sending campaign emails
  const campaignEmailForm = useForm<CampaignEmailFormData>({
    resolver: zodResolver(campaignEmailSchema),
    defaultValues: {
      campaignId: '',
      templateId: '',
      subject: '',
      segmentId: '',
      scheduledFor: '',
      testEmail: '',
    }
  });

  useEffect(() => {
    if (selectedCampaign) {
      campaignEmailForm.setValue('campaignId', selectedCampaign.id);
    }

    if (selectedTemplate) {
      campaignEmailForm.setValue('templateId', selectedTemplate.id);
      campaignEmailForm.setValue('subject', selectedTemplate.subject);
    }
  }, [selectedCampaign, selectedTemplate, campaignEmailForm]);

  // Send campaign email mutation
  const sendCampaignEmailMutation = useMutation({
    mutationFn: async (data: CampaignEmailFormData) => {
      const response = await fetch('/api/campaigns/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send campaign email');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Campaign Email Scheduled',
        description: 'Your campaign email has been scheduled successfully.',
      });
      setIsNewEmailDialogOpen(false);
      refetchCampaignEmails();
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Schedule Email',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Send test email mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: async (data: { templateId: number, to: string }) => {
      const response = await fetch('/api/email/send-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: data.templateId,
          to: data.to,
          data: { 
            // Sample data for template variables
            name: "Test User",
            company: "Test Company",
            date: new Date().toLocaleDateString(),
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send test email');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Test Email Sent',
        description: `Test email was sent to ${variables.to}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Send Test Email',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    campaignEmailForm.reset({
      campaignId: '',
      templateId: '',
      subject: '',
      segmentId: '',
      scheduledFor: '',
      testEmail: '',
    });
    setSelectedCampaign(null);
    setSelectedTemplate(null);
  };

  const onCampaignEmailSubmit = (data: CampaignEmailFormData) => {
    sendCampaignEmailMutation.mutate(data);
  };

  const handleSendTestEmail = () => {
    const testEmail = campaignEmailForm.getValues('testEmail');
    const templateId = campaignEmailForm.getValues('templateId');
    
    if (!testEmail) {
      toast({
        title: "Missing Information",
        description: "Please provide a test email address",
        variant: "destructive",
      });
      return;
    }
    
    if (!templateId) {
      toast({
        title: "Missing Information",
        description: "Please select an email template",
        variant: "destructive",
      });
      return;
    }
    
    sendTestEmailMutation.mutate({
      templateId: Number(templateId),
      to: testEmail,
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get badge variant based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge>Scheduled</Badge>;
      case 'sent':
        return <Badge variant="outline">Sent</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Email Campaign Integration</h2>
        <Button onClick={() => setIsNewEmailDialogOpen(true)}>
          <Send className="mr-2 h-4 w-4" />
          Create Campaign Email
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns">
            <LinkIcon className="mr-2 h-4 w-4" />
            Linked Campaigns
          </TabsTrigger>
          <TabsTrigger value="templates">
            <List className="mr-2 h-4 w-4" />
            Available Templates
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            <Send className="mr-2 h-4 w-4" />
            Scheduled Emails
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Campaigns</CardTitle>
              <CardDescription>
                Campaigns that can be linked with email templates for targeted communication.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCampaignsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading campaigns...</span>
                </div>
              ) : campaignsError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load campaigns. Please try again.
                  </AlertDescription>
                </Alert>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Campaigns Found</h3>
                  <p className="text-muted-foreground">
                    Create marketing campaigns to start sending targeted emails.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {campaigns.map((campaign: any) => (
                    <Card key={campaign.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Badge variant="outline" className="mr-2">
                            {campaign.type}
                          </Badge>
                          <span>{formatDate(campaign.createdAt)}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-2 line-clamp-2">{campaign.description}</p>
                        <div className="flex items-center text-sm text-muted-foreground mt-2">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{campaign.audience || 'All Customers'}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-muted/50 pt-2">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setSelectedCampaign(campaign);
                            setIsNewEmailDialogOpen(true);
                          }}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Create Email
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Available email templates that can be used in campaigns.
              </CardDescription>
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
              ) : emailTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Templates Found</h3>
                  <p className="text-muted-foreground">
                    Create email templates to start sending campaign emails.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {emailTemplates.map((template: any) => (
                    <Card key={template.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Badge variant="outline" className="mr-2">
                            {template.category || 'General'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm font-medium mb-1">Subject:</p>
                        <p className="text-sm mb-3 line-clamp-1">{template.subject}</p>
                        
                        {template.variables && template.variables.length > 0 && (
                          <>
                            <p className="text-sm font-medium mb-1">Variables:</p>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {template.variables.map((variable: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {variable}
                                </Badge>
                              ))}
                            </div>
                          </>
                        )}
                      </CardContent>
                      <CardFooter className="bg-muted/50 pt-2">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setIsNewEmailDialogOpen(true);
                          }}
                        >
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Use in Campaign
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Emails Tab */}
        <TabsContent value="scheduled" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Campaign Emails</CardTitle>
              <CardDescription>
                View and manage all scheduled and sent campaign emails.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCampaignEmailsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading scheduled emails...</span>
                </div>
              ) : campaignEmailsError ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Error Loading Emails</h3>
                  <p className="text-muted-foreground">
                    We couldn't load your scheduled emails.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => refetchCampaignEmails()}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              ) : !campaignEmails || campaignEmails.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Scheduled Emails</h3>
                  <p className="text-muted-foreground">
                    Schedule campaign emails to reach your audience.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsNewEmailDialogOpen(true)}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Create Your First Campaign Email
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {campaignEmails.map((email: any) => (
                    <Card key={email.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{email.subject}</CardTitle>
                          {getStatusBadge(email.status)}
                        </div>
                        <CardDescription>
                          Campaign: {email.campaignName}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Template:</span>
                            <span>{email.templateName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Segment:</span>
                            <span>{email.segmentName || 'All Customers'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Scheduled:</span>
                            <span>{formatDate(email.scheduledFor)}</span>
                          </div>
                          {email.sentAt && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Sent:</span>
                              <span>{formatDate(email.sentAt)}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="bg-muted/50 pt-2 flex justify-between">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={email.status !== 'scheduled'}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          disabled={email.status !== 'scheduled'}
                        >
                          Cancel
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog for creating new campaign email */}
      <Dialog open={isNewEmailDialogOpen} onOpenChange={setIsNewEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Campaign Email</DialogTitle>
            <DialogDescription>
              Link an email template with a campaign and schedule it for sending.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...campaignEmailForm}>
            <form onSubmit={campaignEmailForm.handleSubmit(onCampaignEmailSubmit)} className="space-y-4">
              <FormField
                control={campaignEmailForm.control}
                name="campaignId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign</FormLabel>
                    <Select 
                      onValueChange={val => {
                        field.onChange(val);
                        const campaign = campaigns.find((c: any) => c.id === parseInt(val, 10));
                        setSelectedCampaign(campaign);
                      }}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a campaign" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {campaigns.map((campaign: any) => (
                          <SelectItem key={campaign.id} value={campaign.id.toString()}>
                            {campaign.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={campaignEmailForm.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Template</FormLabel>
                    <Select 
                      onValueChange={val => {
                        field.onChange(val);
                        const template = emailTemplates.find((t: any) => t.id === parseInt(val, 10));
                        setSelectedTemplate(template);
                        if (template) {
                          campaignEmailForm.setValue('subject', template.subject);
                        }
                      }}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an email template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {emailTemplates.map((template: any) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={campaignEmailForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Subject</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter email subject line" />
                    </FormControl>
                    <FormDescription>
                      You can customize the subject line or use the template's default subject.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={campaignEmailForm.control}
                name="segmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Segment (Optional)</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All customers" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All customers</SelectItem>
                        {segments.map((segment: any) => (
                          <SelectItem key={segment.id} value={segment.id.toString()}>
                            {segment.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Target a specific customer segment or leave blank to target all customers.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={campaignEmailForm.control}
                name="scheduledFor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schedule For (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Leave blank to send immediately, or select a future date and time.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={campaignEmailForm.control}
                name="testEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Email Address (Optional)</FormLabel>
                    <FormControl>
                      <div className="flex space-x-2">
                        <Input
                          type="email"
                          placeholder="your-email@example.com"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSendTestEmail}
                          disabled={!field.value || !campaignEmailForm.getValues('templateId')}
                        >
                          Send Test
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Send a test email to preview how it will look before scheduling.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewEmailDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={sendCampaignEmailMutation.isPending}
                >
                  {sendCampaignEmailMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    'Schedule Campaign Email'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailCampaignIntegration;