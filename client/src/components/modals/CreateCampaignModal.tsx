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
  targetAudience: z.object({
    inactive: z.boolean().default(false),
    top: z.boolean().default(false),
    new: z.boolean().default(false),
    recurring: z.boolean().default(false),
    industry: z.boolean().default(false),
    location: z.boolean().default(false),
    seasonal: z.boolean().default(false),
    highSpenders: z.boolean().default(false),
    recentActivity: z.boolean().default(false),
  }),
  industryValue: z.string().optional(),
  locationValue: z.string().optional(),
  seasonalValue: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
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
  
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      type: "",
      targetAudience: {
        inactive: false,
        top: false,
        new: false,
        recurring: false,
        industry: false,
        location: false,
        seasonal: false,
        highSpenders: false,
        recentActivity: false,
      },
      industryValue: "",
      locationValue: "",
      seasonalValue: "",
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
      let targetInactive = false;
      let targetTop = false;
      let targetNew = false;
      let targetRecurring = false;
      let targetIndustry = false;
      let targetLocation = false;
      let targetSeasonal = false;
      let targetHighSpenders = false;
      let targetRecentActivity = false;
      
      const command = voiceData.command.toLowerCase();
      
      if (command.includes("inactive") || command.includes("haven't purchased")) {
        targetInactive = true;
        campaignName = "Re-engagement Campaign";
      } else if (command.includes("top") || command.includes("best") || command.includes("vip")) {
        targetTop = true;
        campaignName = "VIP Customer Campaign";
      } else if (command.includes("new")) {
        targetNew = true;
        campaignName = "New Customer Welcome";
      } else if (command.includes("recurring") || command.includes("regular")) {
        targetRecurring = true;
        campaignName = "Recurring Customer Appreciation";
      } else if (command.includes("industry") || command.includes("business") || command.includes("sector")) {
        targetIndustry = true;
        campaignName = "Industry-Specific Campaign";
      } else if (command.includes("location") || command.includes("region") || command.includes("area")) {
        targetLocation = true;
        campaignName = "Regional Campaign";
      } else if (command.includes("seasonal") || command.includes("holiday") || command.includes("summer") || command.includes("winter")) {
        targetSeasonal = true;
        campaignName = "Seasonal Promotion";
      } else if (command.includes("high spend") || command.includes("big purchase")) {
        targetHighSpenders = true;
        campaignName = "High-Value Purchase Campaign";
      } else if (command.includes("recent activity") || command.includes("engaged")) {
        targetRecentActivity = true;
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
      let message = "";
      
      // Select appropriate message based on the audience type
      if (targetInactive) {
        message = aiGeneratedMessages[1]; // Inactive customer re-engagement message
      } else if (targetTop) {
        message = aiGeneratedMessages[2]; // VIP customer message
      } else if (targetNew) {
        message = aiGeneratedMessages[3]; // New customer message
      } else if (targetRecurring) {
        message = aiGeneratedMessages[4]; // Recurring customer message
      } else if (targetHighSpenders) {
        message = aiGeneratedMessages[5]; // High-value customers message
      } else if (targetSeasonal) {
        message = aiGeneratedMessages[6]; // Seasonal message
      } else if (targetLocation) {
        message = aiGeneratedMessages[7]; // Location-specific message
      } else if (targetIndustry) {
        message = aiGeneratedMessages[8]; // Industry-specific message
      } else {
        message = aiGeneratedMessages[0]; // Default general message
      }
      
      // In a real implementation, we would call the OpenAI API to generate customized messages
      // based on customer data and campaign type
      
      form.reset({
        ...form.getValues(),
        name: campaignName,
        type: campaignType,
        targetAudience: {
          inactive: targetInactive,
          top: targetTop,
          new: targetNew,
          recurring: targetRecurring,
          industry: targetIndustry,
          location: targetLocation,
          seasonal: targetSeasonal,
          highSpenders: targetHighSpenders,
          recentActivity: targetRecentActivity,
        },
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
      const audiences = form.getValues().targetAudience;
      if (!Object.values(audiences).some(v => v)) {
        // No audience selected, use default messages
        setAiGeneratedSuggestions(aiGeneratedMessages);
        return;
      }

      // Create audience description for AI
      let audienceDescriptions = [];
      if (audiences.inactive) audienceDescriptions.push("inactive customers who haven't made a purchase recently");
      if (audiences.top) audienceDescriptions.push("top VIP customers with high lifetime value");
      if (audiences.new) audienceDescriptions.push("new customers who joined in the last 30 days");
      if (audiences.recurring) audienceDescriptions.push("recurring customers with 2+ purchases");
      if (audiences.highSpenders) audienceDescriptions.push("high-spending customers");
      if (audiences.seasonal) audienceDescriptions.push("customers interested in seasonal offers");
      if (audiences.location) {
        const location = form.getValues().locationValue || "specific regions";
        audienceDescriptions.push(`customers in ${location}`);
      }
      if (audiences.industry) {
        const industry = form.getValues().industryValue || "specific industries";
        audienceDescriptions.push(`customers in the ${industry} industry`);
      }
      if (audiences.recentActivity) audienceDescriptions.push("customers with recent activity");

      const targetAudience = audienceDescriptions.join(", ");
      const campaignType = form.getValues().type || "email";
      const campaignGoal = `Create a ${campaignType} campaign to engage ${targetAudience}`;

      setIsLoadingSuggestions(true);
      suggestionsMutation.mutate({ campaignGoal, targetAudience });
    };

    // Debounce the fetch to avoid too many requests while user is selecting options
    const timeoutId = setTimeout(fetchSuggestions, 500);
    return () => clearTimeout(timeoutId);
  }, [refreshSuggestions]);

  // Toggle selectors based on checkboxes and trigger message refresh
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'targetAudience.industry') {
        setShowIndustrySelector(!!value.targetAudience?.industry);
      } else if (name === 'targetAudience.location') {
        setShowLocationSelector(!!value.targetAudience?.location);
      } else if (name === 'targetAudience.seasonal') {
        setShowSeasonalSelector(!!value.targetAudience?.seasonal);
      }
      
      // If any target audience checkbox or campaign type changes, trigger a refresh of message suggestions
      if ((name && name.startsWith('targetAudience.')) || name === 'type') {
        setRefreshSuggestions(prev => prev + 1);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);
  
  const onSubmit = (data: CampaignFormValues) => {
    onCreateCampaign(data);
    form.reset();
    onClose();
  };
  
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
            
            <div>
              <Label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</Label>
              <div className="border border-slate-300 rounded-lg p-4">
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="targetAudience.inactive"
                    render={({ field }) => (
                      <div className="flex items-center">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            id="target-inactive" 
                          />
                        </FormControl>
                        <Label 
                          htmlFor="target-inactive" 
                          className="ml-2 text-sm text-slate-700"
                        >
                          Inactive customers (no purchase in last 3 months)
                        </Label>
                      </div>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="targetAudience.top"
                    render={({ field }) => (
                      <div className="flex items-center">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            id="target-top" 
                          />
                        </FormControl>
                        <Label 
                          htmlFor="target-top" 
                          className="ml-2 text-sm text-slate-700"
                        >
                          Top 100 customers by revenue
                        </Label>
                      </div>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="targetAudience.new"
                    render={({ field }) => (
                      <div className="flex items-center">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            id="target-new" 
                          />
                        </FormControl>
                        <Label 
                          htmlFor="target-new" 
                          className="ml-2 text-sm text-slate-700"
                        >
                          New customers (joined in last 30 days)
                        </Label>
                      </div>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="targetAudience.recurring"
                    render={({ field }) => (
                      <div className="flex items-center">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            id="target-recurring" 
                          />
                        </FormControl>
                        <Label 
                          htmlFor="target-recurring" 
                          className="ml-2 text-sm text-slate-700"
                        >
                          Recurring customers (2+ purchases)
                        </Label>
                      </div>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="targetAudience.highSpenders"
                    render={({ field }) => (
                      <div className="flex items-center">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            id="target-high-spenders" 
                          />
                        </FormControl>
                        <Label 
                          htmlFor="target-high-spenders" 
                          className="ml-2 text-sm text-slate-700"
                        >
                          High-value purchases (over $500)
                        </Label>
                      </div>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="targetAudience.recentActivity"
                    render={({ field }) => (
                      <div className="flex items-center">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            id="target-recent-activity" 
                          />
                        </FormControl>
                        <Label 
                          htmlFor="target-recent-activity" 
                          className="ml-2 text-sm text-slate-700"
                        >
                          Recent activity (active in last 7 days)
                        </Label>
                      </div>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="targetAudience.seasonal"
                    render={({ field }) => (
                      <div className="flex items-center">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            id="target-seasonal" 
                          />
                        </FormControl>
                        <Label 
                          htmlFor="target-seasonal" 
                          className="ml-2 text-sm text-slate-700"
                        >
                          Seasonal shoppers
                        </Label>
                      </div>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="targetAudience.location"
                    render={({ field }) => (
                      <div className="flex items-center">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            id="target-location" 
                          />
                        </FormControl>
                        <Label 
                          htmlFor="target-location" 
                          className="ml-2 text-sm text-slate-700"
                        >
                          Specific location
                        </Label>
                      </div>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="targetAudience.industry"
                    render={({ field }) => (
                      <div className="flex items-center">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            id="target-industry" 
                          />
                        </FormControl>
                        <Label 
                          htmlFor="target-industry" 
                          className="ml-2 text-sm text-slate-700"
                        >
                          Specific industry
                        </Label>
                      </div>
                    )}
                  />
                </div>
                
                {showIndustrySelector && (
                  <div className="mt-3">
                    <FormField
                      control={form.control}
                      name="industryValue"
                      render={({ field }) => (
                        <FormItem>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select industry" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="finance">Finance</SelectItem>
                              <SelectItem value="technology">Technology</SelectItem>
                              <SelectItem value="healthcare">Healthcare</SelectItem>
                              <SelectItem value="retail">Retail</SelectItem>
                              <SelectItem value="manufacturing">Manufacturing</SelectItem>
                              <SelectItem value="education">Education</SelectItem>
                              <SelectItem value="hospitality">Hospitality</SelectItem>
                              <SelectItem value="transportation">Transportation</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {showLocationSelector && (
                  <div className="mt-3">
                    <FormField
                      control={form.control}
                      name="locationValue"
                      render={({ field }) => (
                        <FormItem>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="northeast">Northeast</SelectItem>
                              <SelectItem value="southeast">Southeast</SelectItem>
                              <SelectItem value="midwest">Midwest</SelectItem>
                              <SelectItem value="southwest">Southwest</SelectItem>
                              <SelectItem value="west">West Coast</SelectItem>
                              <SelectItem value="international">International</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {showSeasonalSelector && (
                  <div className="mt-3">
                    <FormField
                      control={form.control}
                      name="seasonalValue"
                      render={({ field }) => (
                        <FormItem>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select season" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="spring">Spring</SelectItem>
                              <SelectItem value="summer">Summer</SelectItem>
                              <SelectItem value="fall">Fall</SelectItem>
                              <SelectItem value="winter">Winter</SelectItem>
                              <SelectItem value="holiday">Holiday Season</SelectItem>
                              <SelectItem value="backToSchool">Back to School</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
            
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
