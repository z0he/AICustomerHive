import { FC, useState, useEffect, useMemo } from "react";
import { X, Megaphone, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

const campaignFormSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  type: z.string().min(1, "Campaign type is required"),
  targetAudience: z.string().min(1, "Target audience is required"),
  location: z.string().optional(),
  industry: z.string().optional(),
  season: z.string().optional(),
  leadSource: z.string().optional(),
  leadStatus: z.string().optional(),
  message: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

interface CreateCampaignModalProps {
  isOpen: boolean;
  voiceData?: {
    command: string;
    targetAudience?: string;
  };
  onCreateCampaign: (data: CampaignFormValues) => void;
  onClose: () => void;
}

const CreateCampaignModal: FC<CreateCampaignModalProps> = ({
  isOpen,
  voiceData,
  onCreateCampaign,
  onClose
}) => {
  const [showIndustrySelector, setShowIndustrySelector] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [showSeasonalSelector, setShowSeasonalSelector] = useState(false);
  const [showLeadFilters, setShowLeadFilters] = useState(false);
  
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      type: "",
      targetAudience: "",
      location: "",
      industry: "",
      season: "",
      leadSource: "",
      leadStatus: "",
      message: "",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
  });

  const aiGeneratedMessages = [
    // General Messages
    "Join us for our limited-time Summer Sale with exclusive discounts up to 30% on all products. Don't miss out!",
    "We miss you! It's been a while since your last purchase. Come back and enjoy a special 15% discount on your next order.",
    "Thank you for being one of our valued customers! Here's an exclusive offer just for our top clients.",
    
    // For Specific Audiences
    "Welcome to our family! As a new customer, enjoy 20% off your next purchase. Explore our full catalog and discover what makes us special.",
    "We value your loyalty! As a recurring customer, you've been upgraded to our Premium tier with exclusive benefits and early access to new products.",
    "Based on your purchase history, we think you'll love our latest collection. Premium customers like you get first access!",
    "Our seasonal collection is here! Get ready for [season] with our specially curated products and limited-time offers.",
    "We're expanding in your area! Visit our new location in [region] and enjoy special grand opening discounts this month only.",
    
    // Industry-Specific Messages
    "As leaders in the [industry] sector, we understand your unique challenges. Our tailored solutions can help you achieve your goals faster.",
    "Our latest software update includes features specifically designed for healthcare professionals. Schedule a demo to see how it can streamline your practice."
  ];

  // Apply voice command data if provided
  useEffect(() => {
    if (voiceData && isOpen) {
      // Extract campaign name from command
      let campaignName = "New Campaign";
      let campaignType = "email";
      let targetAudience = "All Customers";
      
      const command = voiceData.command.toLowerCase();
      
      if (command.includes("inactive") || command.includes("haven't purchased")) {
        targetAudience = "Inactive Customers";
        campaignName = "Re-engagement Campaign";
      } else if (command.includes("top") || command.includes("best") || command.includes("vip")) {
        targetAudience = "Top Customers";
        campaignName = "VIP Customer Campaign";
      } else if (command.includes("new")) {
        targetAudience = "New Customers";
        campaignName = "New Customer Welcome";
      } else if (command.includes("recurring") || command.includes("regular")) {
        targetAudience = "Recurring Customers";
        campaignName = "Recurring Customer Appreciation";
      } else if (command.includes("industry") || command.includes("business") || command.includes("sector")) {
        targetAudience = "Industry-Specific Customers";
        campaignName = "Industry-Specific Campaign";
      } else if (command.includes("location") || command.includes("region") || command.includes("area")) {
        targetAudience = "Specific Location Customers";
        campaignName = "Regional Campaign";
      } else if (command.includes("seasonal") || command.includes("holiday") || command.includes("summer") || command.includes("winter")) {
        targetAudience = "Seasonal Campaign";
        campaignName = "Seasonal Promotion";
      } else if (command.includes("high spend") || command.includes("big purchase")) {
        targetAudience = "High-Spending Customers";
        campaignName = "High-Value Purchase Campaign";
      } else if (command.includes("recent activity") || command.includes("engaged")) {
        targetAudience = "Recently Active Customers";
        campaignName = "Recent Activity Follow-up";
      }
      
      if (command.includes("email")) {
        campaignType = "email";
      } else if (command.includes("social")) {
        campaignType = "social";
      } else if (command.includes("nurture")) {
        campaignType = "nurture";
      } else if (command.includes("promotional")) {
        campaignType = "promotional";
      }
      
      // Use enhanced AI-generated messages based on the target audience
      let message = aiGeneratedMessages[0]; // Default general message
      
      // Select appropriate message based on the audience type
      if (targetAudience === "Inactive Customers") {
        message = aiGeneratedMessages[1];
      } else if (targetAudience === "Top Customers") {
        message = aiGeneratedMessages[2];
      } else if (targetAudience === "New Customers") {
        message = aiGeneratedMessages[3];
      } else if (targetAudience === "Recurring Customers") {
        message = aiGeneratedMessages[4];
      } else if (targetAudience === "High-Spending Customers") {
        message = aiGeneratedMessages[5];
      } else if (targetAudience === "Seasonal Campaign") {
        // Will be replaced with actual season later
        message = aiGeneratedMessages[6].replace("[season]", "the season");
      } else if (targetAudience === "Specific Location Customers") {
        // Will be replaced with actual location later
        message = aiGeneratedMessages[7].replace("[region]", "your region");
      } else if (targetAudience === "Industry-Specific Customers") {
        // Will be replaced with actual industry later
        message = aiGeneratedMessages[8].replace("[industry]", "your industry");
      }
      
      // In a real implementation, we would call the OpenAI API to generate customized messages
      // based on customer data and campaign type
      
      // Set appropriate secondary selectors
      setShowLocationSelector(targetAudience === "Specific Location Customers");
      setShowIndustrySelector(targetAudience === "Industry-Specific Customers");
      setShowSeasonalSelector(targetAudience === "Seasonal Campaign");
      
      // Default values for secondary fields if selected
      let location = "";
      let industry = "";
      let season = "";
      
      // Extract potential location/industry from command
      if (targetAudience === "Specific Location Customers") {
        if (command.includes("north america")) location = "North America";
        else if (command.includes("europe")) location = "Europe";
        else if (command.includes("asia")) location = "Asia Pacific";
        else if (command.includes("latin")) location = "Latin America";
        else if (command.includes("middle east")) location = "Middle East";
        else if (command.includes("africa")) location = "Africa";
        else if (command.includes("urban")) location = "Urban Areas";
        else if (command.includes("rural")) location = "Rural Areas";
        else if (command.includes("suburban")) location = "Suburban Areas";
      }
      
      if (targetAudience === "Industry-Specific Customers") {
        if (command.includes("tech")) industry = "Technology";
        else if (command.includes("health")) industry = "Healthcare";
        else if (command.includes("finance") || command.includes("banking")) industry = "Finance";
        else if (command.includes("retail") || command.includes("ecommerce")) industry = "Retail";
        else if (command.includes("manufacturing")) industry = "Manufacturing";
        else if (command.includes("education")) industry = "Education";
        else if (command.includes("entertainment") || command.includes("media")) industry = "Entertainment";
        else if (command.includes("hospitality") || command.includes("travel")) industry = "Hospitality";
        else if (command.includes("real estate")) industry = "Real Estate";
        else if (command.includes("services")) industry = "Professional Services";
        else if (command.includes("non-profit") || command.includes("ngo")) industry = "Non-profit";
      }
      
      if (targetAudience === "Seasonal Campaign") {
        if (command.includes("spring")) season = "Spring";
        else if (command.includes("summer")) season = "Summer";
        else if (command.includes("fall") || command.includes("autumn")) season = "Fall";
        else if (command.includes("winter")) season = "Winter";
        else if (command.includes("holiday")) season = "Holiday Season";
        else if (command.includes("school")) season = "Back to School";
        else if (command.includes("new year")) season = "New Year";
      }
      
      form.reset({
        ...form.getValues(),
        name: campaignName,
        type: campaignType,
        targetAudience: targetAudience,
        location,
        industry, 
        season,
        message
      });
    }
  }, [voiceData, isOpen, form]);
  
  // useState to track when to refresh message suggestions
  const [refreshSuggestions, setRefreshSuggestions] = useState(0);
  const [aiGeneratedSuggestions, setAiGeneratedSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const { toast } = useToast();

  // API mutation for fetching AI-powered campaign suggestions
  const suggestionsMutation = useMutation({
    mutationFn: async (data: { campaignGoal: string; targetAudience: string }) => {
      const response = await fetch('/api/ai/campaign-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaign suggestions');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.suggestions && data.suggestions.length > 0) {
        setAiGeneratedSuggestions(data.suggestions);
      } else {
        // Fallback to static messages if no suggestions are returned
        setAiGeneratedSuggestions(aiGeneratedMessages);
      }
      setIsLoadingSuggestions(false);
    },
    onError: (error) => {
      console.error('Error fetching campaign suggestions:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate AI campaign suggestions. Using default messages instead.',
        variant: 'destructive'
      });
      setAiGeneratedSuggestions(aiGeneratedMessages);
      setIsLoadingSuggestions(false);
    }
  });

  // Fetch AI suggestions when target audience changes
  useEffect(() => {
    const fetchSuggestions = () => {
      const targetAudience = form.getValues().targetAudience;
      if (!targetAudience) {
        // No audience selected, use default messages
        setAiGeneratedSuggestions(aiGeneratedMessages);
        return;
      }

      const campaignType = form.getValues().type || "email";
      const campaignGoal = `Create a ${campaignType} campaign to engage ${targetAudience}`;

      setIsLoadingSuggestions(true);
      suggestionsMutation.mutate({ campaignGoal, targetAudience });
    };

    // Debounce the fetch to avoid too many requests while user is selecting options
    const timeoutId = setTimeout(fetchSuggestions, 500);
    return () => clearTimeout(timeoutId);
  }, [refreshSuggestions]);

  // Trigger message refresh when target audience or type changes
  // Also show/hide specific selectors based on audience type
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // When audience selection changes, trigger a refresh of message suggestions
      if (name === 'targetAudience' || name === 'type') {
        setRefreshSuggestions(prev => prev + 1);
        
        // Show/hide specific selectors based on audience selection
        if (name === 'targetAudience') {
          const targetAudience = value.targetAudience;
          setShowLocationSelector(targetAudience === "Specific Location Customers");
          setShowIndustrySelector(targetAudience === "Industry-Specific Customers");
          setShowSeasonalSelector(targetAudience === "Seasonal Campaign");
          setShowLeadFilters(targetAudience === "Leads");
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);
  
  const onSubmit = (data: CampaignFormValues) => {
    onCreateCampaign(data);
    form.reset();
    onClose();
  };
  
  // Effect to update message placeholders when location, industry, or season is selected
  useEffect(() => {
    const targetAudience = form.getValues().targetAudience;
    const message = form.getValues().message;
    
    if (targetAudience === "Specific Location Customers") {
      const location = form.getValues().location;
      if (location && message.includes("your region")) {
        const updatedMessage = message.replace("your region", location);
        form.setValue('message', updatedMessage, { shouldValidate: true });
      }
    } 
    else if (targetAudience === "Industry-Specific Customers") {
      const industry = form.getValues().industry;
      if (industry && message.includes("your industry")) {
        const updatedMessage = message.replace("your industry", industry);
        form.setValue('message', updatedMessage, { shouldValidate: true });
      }
    }
    else if (targetAudience === "Seasonal Campaign") {
      const season = form.getValues().season;
      if (season && message.includes("the season")) {
        const updatedMessage = message.replace("the season", season);
        form.setValue('message', updatedMessage, { shouldValidate: true });
      }
    }
  }, [form.watch('location'), form.watch('industry'), form.watch('season')]);

  // Get suggestions based on combined AI and static messages
  const filteredMessages = useMemo(() => {
    return aiGeneratedSuggestions.length > 0 ? aiGeneratedSuggestions : aiGeneratedMessages;
  }, [aiGeneratedSuggestions]);
  
  const selectAIMessage = (message: string) => {
    form.setValue('message', message, { shouldValidate: true });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg">
            <Megaphone className="text-primary-500 mr-2" size={20} />
            <span>Create New Campaign</span>
          </DialogTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Summer Sale 2023" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select campaign type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="email">Email Campaign</SelectItem>
                      <SelectItem value="social">Social Media Campaign</SelectItem>
                      <SelectItem value="nurture">Nurture Campaign</SelectItem>
                      <SelectItem value="promotional">Promotional Campaign</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="targetAudience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Audience</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target audience" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="All Customers">All Customers</SelectItem>
                      <SelectItem value="Leads">Leads</SelectItem>
                      <SelectItem value="Inactive Customers">Inactive Customers</SelectItem>
                      <SelectItem value="Top Customers">Top Customers (VIP)</SelectItem>
                      <SelectItem value="New Customers">New Customers</SelectItem>
                      <SelectItem value="Recurring Customers">Recurring Customers</SelectItem>
                      <SelectItem value="High-Spending Customers">High-Spending Customers</SelectItem>
                      <SelectItem value="Recently Active Customers">Recently Active Customers</SelectItem>
                      <SelectItem value="Seasonal Campaign">Seasonal Campaign</SelectItem>
                      <SelectItem value="Specific Location Customers">Specific Location</SelectItem>
                      <SelectItem value="Industry-Specific Customers">Specific Industry</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {showLocationSelector && (
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specify Location</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="North America">North America</SelectItem>
                        <SelectItem value="Europe">Europe</SelectItem>
                        <SelectItem value="Asia Pacific">Asia Pacific</SelectItem>
                        <SelectItem value="Latin America">Latin America</SelectItem>
                        <SelectItem value="Middle East">Middle East</SelectItem>
                        <SelectItem value="Africa">Africa</SelectItem>
                        <SelectItem value="Urban Areas">Urban Areas</SelectItem>
                        <SelectItem value="Rural Areas">Rural Areas</SelectItem>
                        <SelectItem value="Suburban Areas">Suburban Areas</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {showIndustrySelector && (
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specify Industry</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Finance">Finance & Banking</SelectItem>
                        <SelectItem value="Retail">Retail & E-commerce</SelectItem>
                        <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Entertainment">Entertainment & Media</SelectItem>
                        <SelectItem value="Hospitality">Hospitality & Travel</SelectItem>
                        <SelectItem value="Real Estate">Real Estate</SelectItem>
                        <SelectItem value="Professional Services">Professional Services</SelectItem>
                        <SelectItem value="Non-profit">Non-profit & NGO</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {showSeasonalSelector && (
              <FormField
                control={form.control}
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specify Season</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a season" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Spring">Spring</SelectItem>
                        <SelectItem value="Summer">Summer</SelectItem>
                        <SelectItem value="Fall">Fall</SelectItem>
                        <SelectItem value="Winter">Winter</SelectItem>
                        <SelectItem value="Holiday Season">Holiday Season</SelectItem>
                        <SelectItem value="Back to School">Back to School</SelectItem>
                        <SelectItem value="New Year">New Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {showLeadFilters && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="text-sm font-medium text-slate-700">Lead Filters</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="leadSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead Source (Optional)</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="All sources" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">All sources</SelectItem>
                            <SelectItem value="website">Website</SelectItem>
                            <SelectItem value="referral">Referral</SelectItem>
                            <SelectItem value="advertisement">Advertisement</SelectItem>
                            <SelectItem value="social_media">Social Media</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
                            <SelectItem value="partner">Partner</SelectItem>
                            <SelectItem value="import">Import</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="leadStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead Status (Optional)</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">All statuses</SelectItem>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="proposal">Proposal</SelectItem>
                            <SelectItem value="negotiation">Negotiation</SelectItem>
                            <SelectItem value="won">Won</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Filter your leads by source and status. For example, select "Import" source and "New" status to target your recently imported leads.
                </p>
              </div>
            )}

            
            {form.watch('type') === 'email' ? (
              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Email Campaign Setup</h4>
                <p className="text-sm text-blue-700 mb-3">
                  For email campaigns, you'll design your emails using professional templates in the "Create Campaign Email" section after creating this campaign.
                </p>
                <div className="text-xs text-blue-600">
                  <strong>Next steps:</strong>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Create this campaign</li>
                    <li>Go to Email Management → Campaigns tab</li>
                    <li>Click "Create Campaign Email" to link email templates</li>
                  </ol>
                </div>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your campaign message or select an AI-generated option below"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {form.watch('type') !== 'email' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-700">AI-Generated Messages:</p>
                  {isLoadingSuggestions && (
                    <div className="flex items-center text-xs text-slate-500">
                      <RefreshCw className="animate-spin h-3 w-3 mr-1" />
                      <span>Generating suggestions...</span>
                    </div>
                  )}
                </div>
                
                {isLoadingSuggestions ? (
                  <div className="space-y-2">
                    <div className="h-16 bg-slate-100 animate-pulse rounded-md" />
                    <div className="h-16 bg-slate-100 animate-pulse rounded-md" />
                    <div className="h-16 bg-slate-100 animate-pulse rounded-md" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredMessages.map((message: string, idx: number) => (
                      <Card 
                        key={idx} 
                        className="cursor-pointer hover:bg-slate-50 transition-colors border border-slate-200 hover:border-primary-300"
                        onClick={() => selectAIMessage(message)}
                      >
                        <CardContent className="p-3">
                          <p className="text-sm text-slate-700">{message}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-slate-500 mt-2">
                  <span className="font-medium">Tip:</span> Select a target audience and campaign type to get AI-generated message suggestions.
                </p>
              </div>
            )}
            
            <div>
              <Label className="block text-sm font-medium text-slate-700 mb-1">Schedule</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-500">Start Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-500">End Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create Campaign
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCampaignModal;
