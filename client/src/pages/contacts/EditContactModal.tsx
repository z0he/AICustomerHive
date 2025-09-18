import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Plus, Edit3 } from 'lucide-react';

// Industry and Contact Source options
const INDUSTRIES = [
  "Accounting","Airlines/Aviation","Alternative Dispute Resolution","Alternative Medicine","Animation",
  "Apparel & Fashion","Architecture & Planning","Arts and Crafts","Automotive","Aviation & Aerospace",
  "Banking","Biotechnology","Broadcast Media","Building Materials","Business Supplies and Equipment",
  "Capital Markets","Chemicals","Civic & Social Organization","Civil Engineering","Commercial Real Estate",
  "Computer & Network Security","Computer Games","Computer Hardware","Computer Networking","Computer Software",
  "Internet","Construction","Consumer Electronics","Consumer Goods","Consumer Services","Cosmetics","Dairy",
  "Defense & Space","Design","Education Management","E-Learning","Electrical/Electronic Manufacturing",
  "Entertainment","Environmental Services","Events Services","Executive Office","Facilities Services",
  "Farming","Financial Services","Fine Art","Fishery","Food & Beverages","Food Production","Fund-Raising",
  "Furniture","Gambling & Casinos","Glass, Ceramics & Concrete","Government Administration","Government Relations",
  "Graphic Design","Health, Wellness and Fitness","Higher Education","Hospital & Health Care","Hospitality",
  "Human Resources","Import and Export","Individual & Family Services","Industrial Automation","Information Services",
  "Information Technology and Services","Insurance","International Affairs","International Trade and Development",
  "Investment Banking","Investment Management","Judiciary","Law Enforcement","Law Practice","Legal Services",
  "Legislative Office","Leisure, Travel & Tourism","Libraries","Logistics and Supply Chain","Luxury Goods & Jewelry",
  "Machinery","Management Consulting","Maritime","Market Research","Marketing and Advertising",
  "Mechanical or Industrial Engineering","Media Production","Medical Devices","Medical Practice","Mental Health Care",
  "Military","Mining & Metals","Motion Pictures and Film","Museums and Institutions","Music","Nanotechnology",
  "Newspapers","Non-Profit Organization Management","Oil & Energy","Online Media","Outsourcing/Offshoring",
  "Package/Freight Delivery","Packaging and Containers","Paper & Forest Products","Performing Arts","Pharmaceuticals",
  "Philanthropy","Photography","Plastics","Political Organization","Primary/Secondary Education","Printing",
  "Professional Training & Coaching","Program Development","Public Policy","Public Relations and Communications",
  "Public Safety","Publishing","Railroad Manufacture","Ranching","Real Estate","Recreational Facilities and Services",
  "Religious Institutions","Renewables & Environment","Research","Restaurants","Retail","Security and Investigations",
  "Semiconductors","Shipbuilding","Sporting Goods","Sports","Staffing and Recruiting","Supermarkets",
  "Telecommunications","Textiles","Think Tanks","Tobacco","Translation and Localization","Transportation/Trucking/Railroad",
  "Utilities","Venture Capital & Private Equity","Veterinary","Warehousing","Wholesale","Wine and Spirits","Wireless","Writing and Editing"
] as const;

const CONTACT_SOURCES = [
  "Website","Referral","Social Media","Email Campaign","Event","Paid Search","Organic Search",
  "Direct","Trade Show","Webinar","Cold Call","Partner","Advertisement","Content Marketing","Other"
] as const;

interface Contact {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  country?: string;
  lifecycleStage?: string;
  source?: string;
  contactSource?: string;
  owner?: string;
  consent?: {
    gdpr?: boolean;
    casl?: boolean;
    ccpa?: boolean;
    marketing?: boolean;
    analytics?: boolean;
  };
}

interface EditContactModalProps {
  contact?: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
}

const contactSchema = z.object({
  // Support both legacy name field and new firstName/lastName
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  industry: z.preprocess(v => v === '' ? undefined : v, z.enum(INDUSTRIES).optional()),
  country: z.string().optional(),
  lifecycleStage: z.enum(['lead', 'opportunity', 'customer', 'evangelist', 'churned']).default('lead'),
  contactSource: z.preprocess(v => v === '' ? undefined : v, z.enum(CONTACT_SOURCES).optional()),
  source: z.string().optional(), // Legacy field for backward compatibility
  owner: z.string().optional(),
}).refine((data) => {
  // Ensure either name OR firstName is provided
  return data.name || data.firstName;
}, {
  message: "Either full name or first name is required",
  path: ["firstName"]
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function EditContactModal({ contact, isOpen, onClose, mode }: EditContactModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: contact?.name || '',
      firstName: contact?.firstName || (contact?.name ? contact.name.split(' ')[0] : ''),
      lastName: contact?.lastName || (contact?.name ? contact.name.split(' ').slice(1).join(' ') : ''),
      email: contact?.email || '',
      phone: contact?.phone || '',
      jobTitle: contact?.jobTitle || '',
      company: contact?.company || '',
      industry: contact?.industry as any || '',
      country: contact?.country || '',
      lifecycleStage: (contact?.lifecycleStage as any) || 'lead',
      contactSource: contact?.contactSource as any || '',
      source: contact?.source || '',
      owner: contact?.owner || '',
    },
  });

  // Reset form when contact changes or modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        name: contact?.name || '',
        firstName: contact?.firstName || (contact?.name ? contact.name.split(' ')[0] : ''),
        lastName: contact?.lastName || (contact?.name ? contact.name.split(' ').slice(1).join(' ') : ''),
        email: contact?.email || '',
        phone: contact?.phone || '',
        jobTitle: contact?.jobTitle || '',
        company: contact?.company || '',
        industry: contact?.industry as any || '',
        country: contact?.country || '',
        lifecycleStage: (contact?.lifecycleStage as any) || 'lead',
        contactSource: contact?.contactSource as any || '',
        source: contact?.source || '',
        owner: contact?.owner || '',
      });
    }
  }, [contact, isOpen, form]);

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create contact');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({
        title: 'Contact created',
        description: 'New contact has been added successfully.',
      });
      onClose();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create contact. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      if (!contact?.id) throw new Error('Contact ID not found');
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update contact');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({
        title: 'Contact updated',
        description: 'Contact information has been saved successfully.',
      });
      onClose();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update contact. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ContactFormData) => {
    if (mode === 'add') {
      createContactMutation.mutate(data);
    } else {
      updateContactMutation.mutate(data);
    }
  };

  const isLoading = createContactMutation.isPending || updateContactMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'add' ? (
              <>
                <Plus className="h-5 w-5" />
                Add New Contact
              </>
            ) : (
              <>
                <Edit3 className="h-5 w-5" />
                Edit Contact
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? 'Add a new contact to your CRM system.'
              : 'Update contact information and details.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">
                Basic Information
              </h4>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John" 
                          data-testid="input-firstName"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Doe" 
                          data-testid="input-lastName"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="john@example.com" 
                          data-testid="input-email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country/Region</FormLabel>
                      <FormControl>
                        <Input placeholder="United States" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Company Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">
                Company Information
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Inc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Marketing Manager" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-industry">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* CRM Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">
                CRM Information
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lifecycleStage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lifecycle Stage</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="opportunity">Opportunity</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="evangelist">Evangelist</SelectItem>
                          <SelectItem value="churned">Churned</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Source</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-contactSource">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CONTACT_SOURCES.map((source) => (
                            <SelectItem key={source} value={source}>
                              {source}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <FormControl>
                      <Input placeholder="Contact owner" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isLoading} 
            data-testid="button-submit"
          >
            {isLoading ? 'Saving...' : (mode === 'add' ? 'Create Contact' : 'Save Changes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}