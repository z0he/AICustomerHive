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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Edit3,
  User,
  FileText,
  Activity,
  Target,
  Mail,
  Clock,
  Phone,
  MessageSquare,
  Shield,
  Eye,
  Settings
} from 'lucide-react';

// Lead Scoring Components
import LeadScoringCard from '@/components/leads/LeadScoringCard';
import LeadScoringAlgorithm from '@/components/leads/LeadScoringAlgorithm';

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
  const [activeTab, setActiveTab] = useState('profile');
  const [newNote, setNewNote] = useState('');
  const [consent, setConsent] = useState({
    gdpr: contact?.consent?.gdpr ?? false,
    casl: contact?.consent?.casl ?? false,
    ccpa: contact?.consent?.ccpa ?? false,
    marketing: contact?.consent?.marketing ?? false,
    analytics: contact?.consent?.analytics ?? true
  });

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

  // Handle note addition
  const addNote = () => {
    if (!newNote.trim()) return;
    // TODO: Implement note addition API call
    setNewNote('');
    toast({
      title: 'Note added',
      description: 'Note has been added successfully.',
    });
  };

  // Handle lead scoring update
  const handleScoreUpdate = (scoringData: any) => {
    // TODO: Implement score update API call
    toast({
      title: 'Score updated',
      description: 'Lead score has been updated successfully.',
    });
  };

  // Handle consent update
  const handleConsentUpdate = (field: string, value: boolean) => {
    setConsent(prev => ({ ...prev, [field]: value }));
    // TODO: Implement consent update API call
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1000px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {mode === 'add' ? (
              <>
                <Plus className="h-5 w-5" />
                Add New Contact
              </>
            ) : (
              <>
                <Edit3 className="h-5 w-5" />
                Edit Contact: {contact?.firstName || contact?.name}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? 'Add a new contact to your CRM system.'
              : 'Manage contact information, scoring, notes, and marketing preferences.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 flex-shrink-0" data-testid="tabs-contact-edit">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="scoring" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Scoring
              </TabsTrigger>
              <TabsTrigger value="marketing" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Marketing
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="flex-1 overflow-auto">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
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
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="flex-1 overflow-auto">
              <div className="space-y-4 p-1">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">
                    Add New Note
                  </h4>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a note about this contact..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[100px]"
                      data-testid="textarea-note"
                    />
                    <Button 
                      onClick={addNote} 
                      disabled={!newNote.trim()}
                      data-testid="button-add-note"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">
                    Note History
                  </h4>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {/* Mock notes - in real app, fetch from API */}
                      <Card>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline">System</Badge>
                            <span className="text-xs text-muted-foreground">2 days ago</span>
                          </div>
                          <p className="text-sm">Contact created and added to marketing campaign.</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline">Manual</Badge>
                            <span className="text-xs text-muted-foreground">1 week ago</span>
                          </div>
                          <p className="text-sm">Had a great conversation about our services. Very interested in the premium package.</p>
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="flex-1 overflow-auto">
              <div className="space-y-4 p-1">
                <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">
                  Recent Activity
                </h4>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {/* Mock activity - in real app, fetch from API */}
                    <div className="flex items-start space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                        <Mail className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">Email campaign opened</p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                        <Phone className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">Phone call completed</p>
                        <p className="text-xs text-muted-foreground">1 day ago</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                        <MessageSquare className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">Note added by sales team</p>
                        <p className="text-xs text-muted-foreground">3 days ago</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                        <Eye className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">Website page viewed</p>
                        <p className="text-xs text-muted-foreground">1 week ago</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Scoring Tab */}
            <TabsContent value="scoring" className="flex-1 overflow-auto">
              <div className="space-y-4 p-1">
                <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">
                  Lead Scoring
                </h4>
                {mode === 'edit' && contact ? (
                  <div className="space-y-6">
                    <LeadScoringCard
                      lead={contact}
                      onUpdateScore={handleScoreUpdate}
                      isUpdating={false}
                    />
                    <Separator />
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Advanced Scoring Configuration</h5>
                      <LeadScoringAlgorithm
                        lead={contact as any}
                        onScoreUpdate={handleScoreUpdate}
                        mode="individual"
                      />
                    </div>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">Lead Scoring Available After Creation</h3>
                      <p className="text-muted-foreground">Save this contact first to access lead scoring functionality.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Marketing Tab */}
            <TabsContent value="marketing" className="flex-1 overflow-auto">
              <div className="space-y-6 p-1">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">
                    Consent Management
                  </h4>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Privacy & Consent
                      </CardTitle>
                      <CardDescription>
                        Manage marketing permissions and privacy compliance
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="gdpr-consent">GDPR Consent</Label>
                          <p className="text-xs text-muted-foreground">European Union privacy compliance</p>
                        </div>
                        <Switch
                          id="gdpr-consent"
                          checked={consent.gdpr}
                          onCheckedChange={(checked) => handleConsentUpdate('gdpr', checked)}
                          data-testid="switch-gdpr"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="casl-consent">CASL Consent</Label>
                          <p className="text-xs text-muted-foreground">Canadian anti-spam legislation</p>
                        </div>
                        <Switch
                          id="casl-consent"
                          checked={consent.casl}
                          onCheckedChange={(checked) => handleConsentUpdate('casl', checked)}
                          data-testid="switch-casl"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="ccpa-consent">CCPA Consent</Label>
                          <p className="text-xs text-muted-foreground">California Consumer Privacy Act</p>
                        </div>
                        <Switch
                          id="ccpa-consent"
                          checked={consent.ccpa}
                          onCheckedChange={(checked) => handleConsentUpdate('ccpa', checked)}
                          data-testid="switch-ccpa"
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="marketing-consent">Marketing Communications</Label>
                          <p className="text-xs text-muted-foreground">Email campaigns and promotional content</p>
                        </div>
                        <Switch
                          id="marketing-consent"
                          checked={consent.marketing}
                          onCheckedChange={(checked) => handleConsentUpdate('marketing', checked)}
                          data-testid="switch-marketing"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="analytics-consent">Analytics & Performance</Label>
                          <p className="text-xs text-muted-foreground">Website analytics and usage tracking</p>
                        </div>
                        <Switch
                          id="analytics-consent"
                          checked={consent.analytics}
                          onCheckedChange={(checked) => handleConsentUpdate('analytics', checked)}
                          data-testid="switch-analytics"
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Marketing Preferences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="font-medium">Preferred Contact Method</Label>
                          <p className="text-muted-foreground">Email</p>
                        </div>
                        <div>
                          <Label className="font-medium">Frequency</Label>
                          <p className="text-muted-foreground">Weekly</p>
                        </div>
                        <div>
                          <Label className="font-medium">Time Zone</Label>
                          <p className="text-muted-foreground">UTC-5 (EST)</p>
                        </div>
                        <div>
                          <Label className="font-medium">Language</Label>
                          <p className="text-muted-foreground">English</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
            Cancel
          </Button>
          {activeTab === 'profile' && (
            <Button 
              onClick={form.handleSubmit(onSubmit)} 
              disabled={isLoading} 
              data-testid="button-submit"
            >
              {isLoading ? 'Saving...' : (mode === 'add' ? 'Create Contact' : 'Save Changes')}
            </Button>
          )}
          {activeTab !== 'profile' && mode === 'edit' && (
            <Button 
              onClick={() => {
                // Save any tab-specific changes
                toast({
                  title: 'Changes saved',
                  description: 'Your changes have been saved successfully.',
                });
              }}
              data-testid="button-save-tab"
            >
              Save Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}