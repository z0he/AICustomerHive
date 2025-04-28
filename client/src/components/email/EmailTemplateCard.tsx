import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Edit, Trash, Send, Eye } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Template schema for edit/update
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

// Send email with template schema
const sendTemplateEmailSchema = z.object({
  to: z.string().email("Valid recipient email is required"),
  from: z.string().email("Valid sender email is required"),
  data: z.string().optional().transform(val => {
    if (!val) return {};
    try {
      return JSON.parse(val);
    } catch (e) {
      throw new Error("Variable data must be valid JSON");
    }
  }),
});

type EmailTemplateFormData = z.infer<typeof emailTemplateSchema>;
type SendTemplateEmailFormData = z.infer<typeof sendTemplateEmailSchema>;

interface EmailTemplateCardProps {
  template: {
    id: number;
    name: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    category: string;
    isDefault: boolean;
    variables: string[];
    createdAt: string;
    updatedAt?: string;
  };
  onRefresh: () => void;
}

const EmailTemplateCard: React.FC<EmailTemplateCardProps> = ({ template, onRefresh }) => {
  const { toast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');

  // Setup form with template data
  const editTemplateForm = useForm<EmailTemplateFormData>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      name: template.name,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText,
      category: template.category,
      variables: template.variables?.join(', ') || '',
    },
  });

  // Setup send email form
  const sendEmailForm = useForm<SendTemplateEmailFormData>({
    resolver: zodResolver(sendTemplateEmailSchema),
    defaultValues: {
      to: '',
      from: '',
      data: '{}',
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: EmailTemplateFormData) => {
      const response = await fetch(`/api/email/templates/${template.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update email template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Template Updated',
        description: 'Email template has been successfully updated.',
      });
      setIsEditModalOpen(false);
      onRefresh();
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/email/templates/${template.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete email template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Template Deleted',
        description: 'Email template has been successfully deleted.',
      });
      setIsDeleteModalOpen(false);
      onRefresh();
    },
    onError: (error: Error) => {
      toast({
        title: 'Deletion Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Send email with template mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: SendTemplateEmailFormData) => {
      const response = await fetch('/api/email/send-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          templateId: template.id,
        }),
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
        description: 'Your email has been sent successfully using the template.',
      });
      setIsSendModalOpen(false);
      sendEmailForm.reset({
        to: '',
        from: '',
        data: '{}',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Send Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Form submissions
  const onEditSubmit: SubmitHandler<EmailTemplateFormData> = (data) => {
    updateTemplateMutation.mutate(data);
  };

  const onSendSubmit: SubmitHandler<SendTemplateEmailFormData> = (data) => {
    sendEmailMutation.mutate(data);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Generate a sample JSON for template variables
  const generateSampleData = () => {
    if (!template.variables || template.variables.length === 0) {
      return '{}';
    }

    const sampleData: Record<string, string> = {};
    template.variables.forEach(variable => {
      sampleData[variable] = `[${variable} value]`;
    });

    return JSON.stringify(sampleData, null, 2);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">{template.name}</CardTitle>
          {template.isDefault && (
            <Badge variant="default">Default</Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Category: {template.category || 'General'}
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <div className="mb-3">
          <h4 className="text-sm font-medium mb-1">Subject</h4>
          <p className="text-sm truncate">{template.subject}</p>
        </div>
        
        <div className="mb-3">
          <h4 className="text-sm font-medium mb-1">Variables</h4>
          <div className="flex flex-wrap gap-1">
            {template.variables && template.variables.length > 0 ? (
              template.variables.map((variable, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {variable}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No variables</span>
            )}
          </div>
        </div>
        
        <div className="mb-1">
          <h4 className="text-sm font-medium mb-1">Created</h4>
          <p className="text-xs text-muted-foreground">{formatDate(template.createdAt)}</p>
        </div>
        
        {template.updatedAt && (
          <div>
            <h4 className="text-sm font-medium mb-1">Last Updated</h4>
            <p className="text-xs text-muted-foreground">{formatDate(template.updatedAt)}</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="border-t pt-4 justify-between gap-2 flex-wrap">
        <div className="space-x-1">
          <Button variant="ghost" size="sm" onClick={() => setIsPreviewModalOpen(true)}>
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
        </div>
        <div className="space-x-1">
          <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setIsDeleteModalOpen(true)}>
            <Trash className="h-4 w-4 mr-1" />
            Delete
          </Button>
          <Button variant="default" size="sm" onClick={() => setIsSendModalOpen(true)}>
            <Send className="h-4 w-4 mr-1" />
            Use
          </Button>
        </div>
      </CardFooter>

      {/* Edit Template Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Email Template</DialogTitle>
            <DialogDescription>
              Update your email template. Use {"{{variable}}"} syntax for dynamic content.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editTemplateForm}>
            <form onSubmit={editTemplateForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editTemplateForm.control}
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
                control={editTemplateForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="welcome">Welcome</SelectItem>
                        <SelectItem value="follow-up">Follow-up</SelectItem>
                        <SelectItem value="nurture">Nurture</SelectItem>
                        <SelectItem value="promotional">Promotional</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editTemplateForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Line</FormLabel>
                    <FormControl>
                      <Input placeholder="Welcome to Our Platform, {{name}}!" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editTemplateForm.control}
                name="bodyHtml"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HTML Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="<p>Hello {{name}},</p><p>Welcome to our platform!</p>" 
                        className="min-h-[200px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Write your email content in HTML format. Use {"{{variable}}"} for dynamic content.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editTemplateForm.control}
                name="bodyText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plain Text Version</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Hello {{name}}, Welcome to our platform!" 
                        className="min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Plain text version for email clients that don't support HTML.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editTemplateForm.control}
                name="variables"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variables (comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="name, company, date" {...field} />
                    </FormControl>
                    <FormDescription>
                      List the variables used in your template, separated by commas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateTemplateMutation.isPending}
                >
                  {updateTemplateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Template'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Preview Template Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-3xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Template Preview: {template.name}</DialogTitle>
            <DialogDescription>
              Preview how your email template will appear to recipients.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center space-x-2 mb-4">
            <Button 
              variant={previewMode === 'html' ? 'default' : 'outline'} 
              onClick={() => setPreviewMode('html')}
              size="sm"
            >
              HTML Version
            </Button>
            <Button 
              variant={previewMode === 'text' ? 'default' : 'outline'} 
              onClick={() => setPreviewMode('text')}
              size="sm"
            >
              Text Version
            </Button>
          </div>
          
          <div className="flex-1 overflow-auto border rounded-md p-4 h-[500px]">
            {previewMode === 'html' ? (
              <div dangerouslySetInnerHTML={{ __html: template.bodyHtml }} />
            ) : (
              <pre className="whitespace-pre-wrap">{template.bodyText}</pre>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsPreviewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the "{template.name}" template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteTemplateMutation.mutate()}
              disabled={deleteTemplateMutation.isPending}
            >
              {deleteTemplateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Template'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email with Template Modal */}
      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Email with Template</DialogTitle>
            <DialogDescription>
              Use the "{template.name}" template to send an email.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...sendEmailForm}>
            <form onSubmit={sendEmailForm.handleSubmit(onSendSubmit)} className="space-y-4">
              <FormField
                control={sendEmailForm.control}
                name="from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Email</FormLabel>
                    <FormControl>
                      <Input placeholder="your-email@company.com" {...field} />
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
                    <FormLabel>To Email</FormLabel>
                    <FormControl>
                      <Input placeholder="recipient@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {template.variables && template.variables.length > 0 && (
                <FormField
                  control={sendEmailForm.control}
                  name="data"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Variables (JSON)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={generateSampleData()}
                          className="min-h-[150px] font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide values for template variables in JSON format.
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-xs"
                          onClick={() => sendEmailForm.setValue('data', generateSampleData())}
                        >
                          Insert sample data
                        </Button>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsSendModalOpen(false)}
                >
                  Cancel
                </Button>
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
                      Send Email
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EmailTemplateCard;