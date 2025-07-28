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
import { LEAD_SOURCES, LEAD_STATUSES, INDUSTRY_SUGGESTIONS } from "@shared/constants";

// Extend the insert schema with additional validations that match the actual lead schema
const leadFormSchema = insertLeadSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  industry: z.string().min(1, "Industry is required"),
  location: z.string().optional().nullable(),
  email: z.string().email("Please enter a valid email").optional().nullable(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  leadSource: z.string().optional().nullable(),
  leadStatus: z.string().default("new").optional().nullable(),
  leadOwner: z.string().optional().nullable(),
  engagementLevel: z.number().min(0).max(100).default(0).optional().nullable(),
  conversionProbability: z.number().min(0).max(100).default(0).optional().nullable(),
  score: z.number().min(0).max(100).default(0).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
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
      industry: defaultValues?.industry || "",
      location: defaultValues?.location || "",
      email: defaultValues?.email || "",
      phone: defaultValues?.phone || "",
      company: defaultValues?.company || "",
      jobTitle: defaultValues?.jobTitle || "",
      leadSource: defaultValues?.leadSource || "website",
      leadStatus: defaultValues?.leadStatus || "new",
      leadOwner: defaultValues?.leadOwner || "",
      engagementLevel: defaultValues?.engagementLevel || 0,
      conversionProbability: defaultValues?.conversionProbability || 0,
      score: defaultValues?.score || 0,
      tags: defaultValues?.tags || [],
      notes: defaultValues?.notes || "",
    },
  });

  const handleSubmit = (data: LeadFormData) => {
    // Generate initials from name
    const nameParts = data.name.trim().split(' ');
    const initials = nameParts.map(part => part.charAt(0)).join('').toUpperCase();
    
    // Create the complete lead data
    const completeData = {
      ...data,
      initials,
      engagementLevel: engagementLevel || 0,
      score: data.score || 0,
      conversionProbability: data.conversionProbability || 0,
      createdAt: new Date(),
      tags: data.tags || []
    };
    
    onSubmit(completeData);
  };

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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} value={field.value || ""} />
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
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_SUGGESTIONS.map((industry) => (
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
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
          
          {/* Lead Details */}
          <div className="col-span-2 mt-3">
            <h3 className="text-md font-medium mb-3">Lead Details</h3>
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
                      <SelectValue placeholder="Select lead source" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map((source) => (
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
                      <SelectValue placeholder="Select lead status" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((status) => (
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
            name="leadOwner"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lead Owner</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Engagement Metrics */}
          <div className="col-span-2 mt-3">
            <h3 className="text-md font-medium mb-3">Scoring</h3>
          </div>
          
          <div className="col-span-2">
            <FormField
              control={form.control}
              name="engagementLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Engagement Level: {engagementLevel}%</FormLabel>
                  <FormControl>
                    <div className="px-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={engagementLevel}
                        onChange={(e) => setEngagementLevel(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-gray-500 mt-1">
                    How engaged is this lead with your brand? (0 = No engagement, 100 = Highly engaged)
                  </p>
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {/* Notes */}
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