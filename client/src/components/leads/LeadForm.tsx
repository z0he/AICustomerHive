import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { insertLeadSchema } from "@shared/schema";

// Extend the insert schema with additional validations
const leadFormSchema = insertLeadSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().email("Please enter a valid email").optional().nullable(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  leadSource: z.string().optional().nullable(),
  leadStatus: z.string().default("new").optional().nullable(),
  contactIndustry: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  contactSource: z.string().optional().nullable(),
  contactType: z.string().optional().nullable(),
  linkedinUrl: z.string().optional().nullable(),
  legalBasis: z.string().optional().nullable(),
  lifecycleStage: z.string().default("lead").optional().nullable(),
  notes: z.string().optional().nullable(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  onSubmit: (data: LeadFormData) => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<LeadFormData>;
}

export default function LeadForm({ onSubmit, isSubmitting = false, defaultValues }: LeadFormProps) {
  const [engagementLevel, setEngagementLevel] = useState(defaultValues?.engagementLevel || 0);
  
  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      firstName: defaultValues?.firstName || "",
      lastName: defaultValues?.lastName || "",
      industry: defaultValues?.industry || "",
      location: defaultValues?.location || "",
      email: defaultValues?.email || "",
      phone: defaultValues?.phone || "",
      company: defaultValues?.company || "",
      jobTitle: defaultValues?.jobTitle || "",
      leadSource: defaultValues?.leadSource || "website",
      leadStatus: defaultValues?.leadStatus || "new",
      contactIndustry: defaultValues?.contactIndustry || "",
      country: defaultValues?.country || "",
      contactSource: defaultValues?.contactSource || "",
      contactType: defaultValues?.contactType || "",
      linkedinUrl: defaultValues?.linkedinUrl || "",
      legalBasis: defaultValues?.legalBasis || "",
      lifecycleStage: defaultValues?.lifecycleStage || "lead",
      notes: defaultValues?.notes || "",
    },
  });

  const handleSubmit = (data: LeadFormData) => {
    // Add engagement level from slider
    const completeData = {
      ...data,
      engagementLevel
    };
    
    onSubmit(completeData);
  };

  const industrySuggestions = [
    "Technology",
    "Finance",
    "Healthcare",
    "Education",
    "Retail",
    "Manufacturing",
    "Consulting",
    "Entertainment",
    "Real Estate",
    "Transportation",
    "Agriculture",
    "Energy",
    "Hospitality",
    "Government",
    "Non-profit",
  ];
  
  const leadSources = [
    { id: "website", name: "Website" },
    { id: "referral", name: "Referral" },
    { id: "advertisement", name: "Advertisement" },
    { id: "social_media", name: "Social Media" },
    { id: "email", name: "Email" },
    { id: "event", name: "Event" },
    { id: "partner", name: "Partner" },
    { id: "other", name: "Other" },
  ];
  
  const leadStatuses = [
    { id: "new", name: "New" },
    { id: "contacted", name: "Contacted" },
    { id: "qualified", name: "Qualified" },
    { id: "proposal", name: "Proposal" },
    { id: "negotiation", name: "Negotiation" },
    { id: "won", name: "Won" },
    { id: "lost", name: "Lost" },
  ];
  
  const contactTypes = [
    { id: "business", name: "Business" },
    { id: "individual", name: "Individual" },
  ];
  
  const lifecycleStages = [
    { id: "lead", name: "Lead" },
    { id: "customer", name: "Customer" },
    { id: "opportunity", name: "Opportunity" },
    { id: "subscriber", name: "Subscriber" },
  ];
  
  const legalBases = [
    { id: "consent", name: "Consent" },
    { id: "contract", name: "Contract" },
    { id: "legitimate_interest", name: "Legitimate Interest" },
    { id: "legal_obligation", name: "Legal Obligation" },
  ];
  
  const countries = [
    { id: "us", name: "United States" },
    { id: "ca", name: "Canada" },
    { id: "uk", name: "United Kingdom" },
    { id: "au", name: "Australia" },
    { id: "fr", name: "France" },
    { id: "de", name: "Germany" },
    { id: "jp", name: "Japan" },
    { id: "cn", name: "China" },
    { id: "in", name: "India" },
    { id: "br", name: "Brazil" },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basic Information */}
          <div className="col-span-2">
            <h3 className="text-md font-medium mb-3">Basic Information</h3>
          </div>
          
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} value={field.value || ""} />
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
                <FormLabel>Last Name <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} value={field.value || ""} />
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
                <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john@example.com" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+1 (555) 123-4567" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Inc." {...field} value={field.value || ""} />
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
                  <Input placeholder="Marketing Manager" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="linkedinUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LinkedIn URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://linkedin.com/in/johndoe" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="New York, NY" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Classification */}
          <div className="col-span-2 mt-3">
            <h3 className="text-md font-medium mb-3">Classification</h3>
          </div>
          
          <FormField
            control={form.control}
            name="lifecycleStage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lifecycle Stage</FormLabel>
                <FormControl>
                  <Select 
                    value={field.value || "lead"} 
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lifecycle stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {lifecycleStages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="contactType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Type</FormLabel>
                <FormControl>
                  <Select 
                    value={field.value || ""} 
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact type" />
                    </SelectTrigger>
                    <SelectContent>
                      {contactTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="contactIndustry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Select 
                    value={field.value || ""} 
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industrySuggestions.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Select 
                    value={field.value || ""} 
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Lead Information */}
          <div className="col-span-2 mt-3">
            <h3 className="text-md font-medium mb-3">Lead Information</h3>
          </div>
          
          <FormField
            control={form.control}
            name="leadSource"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lead Source</FormLabel>
                <FormControl>
                  <Select 
                    value={field.value || "website"} 
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadSources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="leadStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lead Status</FormLabel>
                <FormControl>
                  <Select 
                    value={field.value || "new"} 
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadStatuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="legalBasis"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Legal Basis</FormLabel>
                <FormControl>
                  <Select 
                    value={field.value || ""} 
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select legal basis" />
                    </SelectTrigger>
                    <SelectContent>
                      {legalBases.map((basis) => (
                        <SelectItem key={basis.id} value={basis.id}>
                          {basis.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Engagement Level Slider */}
        <div className="space-y-2 mt-3">
          <FormLabel>Engagement Level: {engagementLevel}</FormLabel>
          <input
            type="range"
            min="0"
            max="100"
            value={engagementLevel}
            onChange={(e) => setEngagementLevel(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
          </div>
        </div>
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add any important details about this lead..." 
                  className="min-h-[100px]" 
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Lead"}
          </Button>
        </div>
      </form>
    </Form>
  );
}