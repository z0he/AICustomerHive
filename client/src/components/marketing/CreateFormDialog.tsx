import { useState } from 'react';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { queryClient } from '@/lib/queryClient';
import { FormFieldEditor } from './FormFieldEditor';
import { Switch } from '@/components/ui/switch';

// Define the form schema
const formSchema = z.object({
  name: z.string().min(1, 'Form name is required'),
  title: z.string().min(1, 'Form title is required'),
  description: z.string().optional(),
  submitButtonText: z.string().min(1, 'Submit button text is required'),
  successMessage: z.string().min(1, 'Success message is required'),
  redirectUrl: z.string().optional(),
  formType: z.string().min(1, 'Form type is required'),
  folder: z.string().min(1, 'Folder is required'),
  trackingEnabled: z.boolean().default(true),
  captchaEnabled: z.boolean().default(false),
  status: z.string().default('active'),
});

type FormValues = z.infer<typeof formSchema>;

// Define initial form field structure
const initialFormFields = [
  {
    id: '1',
    type: 'text',
    name: 'firstName',
    label: 'First Name',
    placeholder: 'John',
    required: true,
    order: 1,
  },
  {
    id: '2',
    type: 'text',
    name: 'lastName',
    label: 'Last Name',
    placeholder: 'Doe',
    required: true,
    order: 2,
  },
  {
    id: '3',
    type: 'email',
    name: 'email',
    label: 'Email',
    placeholder: 'john@example.com',
    required: true,
    order: 3,
  },
];

interface CreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFormDialog({ open, onOpenChange }: CreateFormDialogProps) {
  const [formFields, setFormFields] = useState(initialFormFields);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      title: 'Contact Us',
      description: 'Fill out this form and we\'ll get back to you as soon as possible.',
      submitButtonText: 'Submit',
      successMessage: 'Thank you for your submission! We\'ll be in touch soon.',
      redirectUrl: '',
      formType: 'inline',
      folder: 'Default',
      trackingEnabled: true,
      captchaEnabled: false,
      status: 'active',
    },
  });

  // Create form mutation
  const createFormMutation = useMutation({
    mutationFn: async (data: FormValues & { formFields: any[] }) => {
      const response = await fetch('/api/marketing/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create form');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Form created',
        description: 'Your form has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/forms'] });
      resetDialog();
    },
    onError: (error) => {
      toast({
        title: 'Error creating form',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (values: FormValues) => {
    setIsSubmitting(true);
    createFormMutation.mutate({
      ...values,
      formFields,
    });
  };

  const resetDialog = () => {
    form.reset();
    setFormFields(initialFormFields);
    setStep(1);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Create New Form</DialogTitle>
          <DialogDescription>
            Design a form to collect information from your website visitors.
          </DialogDescription>
        </DialogHeader>
        
        {step === 1 ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(() => setStep(2))} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Form Name (Internal)</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact Form" {...field} />
                      </FormControl>
                      <FormDescription>
                        This name is for your reference only.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="folder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Folder</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a folder" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Default">Default</SelectItem>
                          <SelectItem value="Contact">Contact</SelectItem>
                          <SelectItem value="Newsletter">Newsletter</SelectItem>
                          <SelectItem value="Lead">Lead Generation</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Organize your forms into folders.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form Title (Visible)</FormLabel>
                    <FormControl>
                      <Input placeholder="Contact Us" {...field} />
                    </FormControl>
                    <FormDescription>
                      This title will be displayed at the top of your form.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Fill out this form and we'll get back to you as soon as possible." 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      A short description that appears below the title.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="formType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Form Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select form type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="inline">Inline Form</SelectItem>
                          <SelectItem value="popup">Popup Form</SelectItem>
                          <SelectItem value="slide-in">Slide-in Form</SelectItem>
                          <SelectItem value="fullpage">Full Page Form</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How the form will appear on your website.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Control whether this form is active or not.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="trackingEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Enable Tracking</FormLabel>
                        <FormDescription>
                          Track visitors and form submissions
                        </FormDescription>
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
                
                <FormField
                  control={form.control}
                  name="captchaEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Enable CAPTCHA</FormLabel>
                        <FormDescription>
                          Protect your form from bots
                        </FormDescription>
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
              
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Next Step
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-6">
            <FormFieldEditor 
              fields={formFields} 
              onChange={setFormFields} 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel>Submit Button Text</FormLabel>
                <Input 
                  placeholder="Submit"
                  value={form.getValues().submitButtonText}
                  onChange={(e) => form.setValue('submitButtonText', e.target.value)}
                />
              </div>
              
              <div>
                <FormLabel>Success Message</FormLabel>
                <Input 
                  placeholder="Thank you for your submission!"
                  value={form.getValues().successMessage}
                  onChange={(e) => form.setValue('successMessage', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <FormLabel>Redirect URL (Optional)</FormLabel>
              <Input 
                placeholder="https://example.com/thank-you"
                value={form.getValues().redirectUrl || ''}
                onChange={(e) => form.setValue('redirectUrl', e.target.value)}
              />
              <div className="text-sm text-muted-foreground mt-1">
                Leave blank to show the success message instead of redirecting.
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button 
                onClick={form.handleSubmit(handleSubmit)} 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Form...
                  </span>
                ) : (
                  'Create Form'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}