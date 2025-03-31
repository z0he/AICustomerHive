import { FC, useState, useEffect } from "react";
import { X, Megaphone } from "lucide-react";
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

const campaignFormSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  type: z.string().min(1, "Campaign type is required"),
  targetAudience: z.object({
    inactive: z.boolean().default(false),
    top: z.boolean().default(false),
    new: z.boolean().default(false),
    industry: z.boolean().default(false),
  }),
  industryValue: z.string().optional(),
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
  
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      type: "",
      targetAudience: {
        inactive: false,
        top: false,
        new: false,
        industry: false,
      },
      industryValue: "",
      message: "",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
  });

  const aiGeneratedMessages = [
    "Join us for our limited-time Summer Sale with exclusive discounts up to 30% on all products. Don't miss out!",
    "We miss you! It's been a while since your last purchase. Come back and enjoy a special 15% discount on your next order.",
    "Thank you for being one of our valued customers! Here's an exclusive offer just for our top clients."
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
      
      const command = voiceData.command.toLowerCase();
      
      if (command.includes("inactive") || command.includes("haven't purchased")) {
        targetInactive = true;
        campaignName = "Re-engagement Campaign";
      } else if (command.includes("top") || command.includes("best")) {
        targetTop = true;
        campaignName = "VIP Customer Campaign";
      } else if (command.includes("new")) {
        targetNew = true;
        campaignName = "New Customer Welcome";
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
      
      let message = "";
      if (targetInactive) {
        message = aiGeneratedMessages[1];
      } else if (targetTop) {
        message = aiGeneratedMessages[2];
      } else {
        message = aiGeneratedMessages[0];
      }
      
      form.reset({
        ...form.getValues(),
        name: campaignName,
        type: campaignType,
        targetAudience: {
          inactive: targetInactive,
          top: targetTop,
          new: targetNew,
          industry: false,
        },
        message
      });
    }
  }, [voiceData, isOpen, form]);
  
  // Toggle industry selector based on checkbox
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'targetAudience.industry') {
        setShowIndustrySelector(!!value.targetAudience?.industry);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);
  
  const onSubmit = (data: CampaignFormValues) => {
    onCreateCampaign(data);
    form.reset();
    onClose();
  };
  
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
              <p className="text-sm font-medium text-slate-700 mb-2">AI-Generated Messages:</p>
              <div className="space-y-2">
                {aiGeneratedMessages.map((message, idx) => (
                  <Card 
                    key={idx} 
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => selectAIMessage(message)}
                  >
                    <CardContent className="p-3">
                      <p className="text-sm text-slate-700">{message}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
