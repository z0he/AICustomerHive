import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Use a simplified version of the form schema
const customerFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  location: z.string().optional(),
  industry: z.string().optional(),
  country: z.string().optional(),
  contactSource: z.string().optional(),
  contactType: z.string().optional(),
  lifecycleStage: z.string().optional(),
  leadStatus: z.string().optional(),
  legalBasis: z.string().optional(),
  linkedin: z.string().optional(),
  notes: z.string().optional()
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  defaultValues?: Partial<CustomerFormValues>;
  onSubmit: (data: CustomerFormValues) => void;
  isSubmitting?: boolean;
}

export default function CustomerForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting = false 
}: CustomerFormProps) {
  const [engagementLevel, setEngagementLevel] = useState(defaultValues?.engagementLevel || 0);
  
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      jobTitle: "",
      location: "",
      industry: "",
      country: "",
      contactSource: "website",
      contactType: "",
      lifecycleStage: "lead",
      leadStatus: "new",
      legalBasis: "",
      linkedin: "",
      notes: "",
      ...defaultValues
    }
  });

  const handleSubmit = (data: CustomerFormValues) => {
    // Add engagement level from slider
    const completeData = {
      ...data,
      engagementLevel
    };
    
    onSubmit(completeData);
  };

  // Available options for dropdowns
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
            name="linkedin"
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
            name="industry"
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
          
          {/* Contact/Lead Information */}
          <div className="col-span-2 mt-3">
            <h3 className="text-md font-medium mb-3">Contact Information</h3>
          </div>
          
          <FormField
            control={form.control}
            name="contactSource"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Source</FormLabel>
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
                <FormLabel>Status</FormLabel>
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
                  placeholder="Add any important details about this contact..." 
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
            {isSubmitting ? "Saving..." : "Save Customer"}
          </Button>
        </div>
      </form>
    </Form>
  );
}