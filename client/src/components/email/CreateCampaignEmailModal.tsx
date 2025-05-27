import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, X, Mail, FileText, Edit3, Send, Eye } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { queryClient } from '@/lib/queryClient';

// Form schema
const campaignEmailSchema = z.object({
  campaignId: z.number(),
  templateId: z.number().optional(),
  subject: z.string().min(1, "Subject is required"),
  emailContent: z.string().min(1, "Email content is required"),
  useTemplate: z.boolean().default(false),
  testEmail: z.string().email().optional(),
});

type CampaignEmailFormData = z.infer<typeof campaignEmailSchema>;

interface CreateCampaignEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: any;
}

const CreateCampaignEmailModal: React.FC<CreateCampaignEmailModalProps> = ({
  isOpen,
  onClose,
  campaign
}) => {
  const [activeTab, setActiveTab] = useState('custom');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const { toast } = useToast();

  const form = useForm<CampaignEmailFormData>({
    resolver: zodResolver(campaignEmailSchema),
    defaultValues: {
      campaignId: campaign?.id || 0,
      subject: '',
      emailContent: '',
      useTemplate: false,
      testEmail: '',
    }
  });

  // Parse campaign target audience to show targeting info
  const getCampaignTargeting = () => {
    if (!campaign?.targetAudience) return "All leads";
    
    try {
      const targeting = JSON.parse(campaign.targetAudience);
      if (targeting.type === "Leads" && targeting.filters) {
        const filters = [];
        if (targeting.filters.source && targeting.filters.source !== "all_sources") {
          filters.push(`Source: ${targeting.filters.source}`);
        }
        if (targeting.filters.status && targeting.filters.status !== "all_statuses") {
          filters.push(`Status: ${targeting.filters.status}`);
        }
        return filters.length > 0 ? filters.join(", ") : "All leads";
      }
    } catch (e) {
      // If not JSON, return as is
    }
    
    return campaign.targetAudience;
  };

  // Fetch email templates
  const { data: emailTemplates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['/api/email/templates'],
    enabled: isOpen,
  });

  // Create campaign email mutation
  const createCampaignEmailMutation = useMutation({
    mutationFn: async (data: CampaignEmailFormData) => {
      const response = await fetch('/api/email/send-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create campaign email');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Campaign email created",
        description: "Your email has been scheduled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign email",
        variant: "destructive",
      });
    },
  });

  // Send test email mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: async (data: { to: string; subject: string; body: string }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          from: 'noreply@mail.aicrm.co.uk',
          to: data.to,
          subject: `[TEST] ${data.subject}`,
          body: data.body,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send test email');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test email sent",
        description: "Your test email has been sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test email failed",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CampaignEmailFormData) => {
    createCampaignEmailMutation.mutate(data);
  };

  const handleSendTest = () => {
    const formData = form.getValues();
    const testEmail = formData.testEmail;
    
    if (!testEmail) {
      toast({
        title: "Test email required",
        description: "Please enter a test email address",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.subject || !formData.emailContent) {
      toast({
        title: "Missing content",
        description: "Please fill in the subject and email content",
        variant: "destructive",
      });
      return;
    }
    
    sendTestEmailMutation.mutate({
      to: testEmail,
      subject: formData.subject,
      body: formData.emailContent,
    });
  };

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    form.setValue('templateId', template.id);
    form.setValue('subject', template.subject);
    form.setValue('emailContent', template.bodyHtml || template.bodyText);
    form.setValue('useTemplate', true);
    setActiveTab('custom'); // Switch to custom tab for editing
  };

  const insertPersonalization = (field: string) => {
    const currentContent = form.getValues('emailContent');
    const newContent = currentContent + `{{${field}}}`;
    form.setValue('emailContent', newContent);
  };

  const personalizationFields = [
    { field: 'firstName', label: 'First Name' },
    { field: 'lastName', label: 'Last Name' },
    { field: 'email', label: 'Email' },
    { field: 'company', label: 'Company' },
    { field: 'jobTitle', label: 'Job Title' },
    { field: 'createdAt', label: 'Created Date' },
    { field: 'leadSource', label: 'Lead Source' },
    { field: 'industry', label: 'Industry' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg">
            <Mail className="text-primary-500 mr-2" size={20} />
            Create Campaign Email
          </DialogTitle>
          <DialogDescription>
            Create an email for campaign: <strong>{campaign?.name}</strong>
          </DialogDescription>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Campaign Targeting Info */}
        <Card className="bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Target Audience</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Badge variant="outline" className="mr-2">
              {getCampaignTargeting()}
            </Badge>
            <span className="text-sm text-muted-foreground">
              This email will be sent to leads matching your campaign criteria
            </span>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="custom" className="flex items-center">
              <Edit3 className="mr-2 h-4 w-4" />
              Custom Email
            </TabsTrigger>
            <TabsTrigger value="template" className="flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Use Template
            </TabsTrigger>
          </TabsList>

          {/* Custom Email Tab */}
          <TabsContent value="custom">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {selectedTemplate && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-blue-700">
                        Template: {selectedTemplate.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-blue-600">
                        You can now edit the content below. Original template variables will be preserved.
                      </p>
                    </CardContent>
                  </Card>
                )}

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Subject</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter email subject line" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        You can use personalization like {`{{firstName}}`} in the subject
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <label className="text-sm font-medium">Personalization Fields</label>
                  <div className="flex flex-wrap gap-2 mt-2 mb-4">
                    {personalizationFields.map((item) => (
                      <Button
                        key={item.field}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertPersonalization(item.field)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="emailContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Content</FormLabel>
                      <FormControl>
                        <div className="border rounded-md">
                          <ReactQuill
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Write your email content here... Use {{firstName}}, {{company}}, etc. for personalization"
                            modules={{
                              toolbar: [
                                [{ 'header': [1, 2, 3, false] }],
                                ['bold', 'italic', 'underline', 'strike'],
                                [{ 'color': [] }, { 'background': [] }],
                                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                [{ 'align': [] }],
                                ['link'],
                                ['clean']
                              ]
                            }}
                            formats={[
                              'header', 'bold', 'italic', 'underline', 'strike',
                              'color', 'background', 'list', 'bullet', 'align', 'link'
                            ]}
                            style={{ minHeight: '200px' }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Use the rich text editor to format your email with headers, bold text, colors, lists, and links. Personalization fields like {`{{firstName}}`}, {`{{company}}`} will be automatically replaced.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="testEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Email Address (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="your-email@example.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Send a test email to preview how it will look before scheduling
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  {form.watch('testEmail') && (
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleSendTest}
                      disabled={sendTestEmailMutation.isPending}
                    >
                      {sendTestEmailMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="mr-2 h-4 w-4" />
                      )}
                      Send Test
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    disabled={createCampaignEmailMutation.isPending}
                  >
                    {createCampaignEmailMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Schedule Campaign Email
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          {/* Template Tab */}
          <TabsContent value="template">
            <div className="space-y-4">
              {isLoadingTemplates ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading templates...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {emailTemplates?.map((template: any) => (
                    <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
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
                      <CardContent className="pt-0">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleTemplateSelect(template)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Use & Edit Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCampaignEmailModal;