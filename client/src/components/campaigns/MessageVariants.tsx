import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BrainCircuit, Plus } from "lucide-react";

// Define types for message variants
interface MessageVariant {
  id: number;
  message: string;
  variantName: string;
  campaignId: number;
  isControl: boolean | null;
  impressions: number | null;
  conversions: number | null;
  conversionRate: number | null;
  createdAt: Date;
}

interface MessageVariantsProps {
  campaignId: number;
  originalMessage: string;
}

export function MessageVariants({ campaignId, originalMessage }: MessageVariantsProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch message variants for this campaign
  const { 
    data: variants = [], 
    isLoading, 
    error 
  } = useQuery<MessageVariant[]>({
    queryKey: ['/api/campaigns', campaignId, 'variants'],
    queryFn: async () => {
      const response = await fetch(`/api/campaigns/${campaignId}/variants`);
      if (!response.ok) {
        throw new Error("Failed to fetch variants");
      }
      return response.json();
    },
    enabled: !!campaignId,
  });

  // Mutation for creating a new variant
  const createVariantMutation = useMutation({
    mutationFn: async (newVariant: { variantName: string, message: string, isControl: boolean }) => {
      return apiRequest(`/api/campaigns/${campaignId}/variants`, {
        method: "POST",
        body: JSON.stringify(newVariant),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId, 'variants'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Variant created",
        description: "Your new message variant has been created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create variant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Function to update variant stats (would be called when the variant is used)
  const updateVariantStats = useMutation({
    mutationFn: async ({ 
      variantId, 
      impressions, 
      conversions 
    }: { 
      variantId: number; 
      impressions?: number; 
      conversions?: number;
    }) => {
      return apiRequest(`/api/variants/${variantId}/stats`, {
        method: "POST",
        body: JSON.stringify({ impressions, conversions }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId, 'variants'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update stats",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Component for creating a new variant
  const CreateVariantForm = () => {
    const [variantName, setVariantName] = useState("");
    const [message, setMessage] = useState("");
    const [isControl, setIsControl] = useState(false);

    const hasControl = variants.some(variant => variant.isControl);

    // If there are no variants yet, pre-fill with the original message
    // and set as control variant
    React.useEffect(() => {
      if (variants.length === 0) {
        setMessage(originalMessage);
        setVariantName("Control");
        setIsControl(true);
      }
    }, [variants.length]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      if (!variantName.trim() || !message.trim()) {
        toast({
          title: "Missing fields",
          description: "Please enter both a name and message for the variant.",
          variant: "destructive",
        });
        return;
      }

      createVariantMutation.mutate({
        variantName,
        message,
        isControl: isControl && !hasControl, // Only allow control if there isn't one already
      });
    };

    return (
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="variantName">Variant Name</Label>
            <Input
              id="variantName"
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              placeholder="e.g. Variant A, Friendly tone, etc."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter the message variant text"
              rows={4}
            />
          </div>

          {!hasControl && (
            <div className="flex items-center space-x-2">
              <Switch
                id="isControl"
                checked={isControl}
                onCheckedChange={setIsControl}
              />
              <Label htmlFor="isControl">Set as control variant</Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="submit" disabled={createVariantMutation.isPending}>
            {createVariantMutation.isPending ? "Creating..." : "Create Variant"}
          </Button>
        </DialogFooter>
      </form>
    );
  };

  // Component for A/B test results visualization
  const TestResultsChart = ({ variants }: { variants: MessageVariant[] }) => {
    // Only include variants with impressions
    const charData = variants
      .filter(v => v.impressions && v.impressions > 0)
      .map(v => ({
        name: v.variantName,
        conversionRate: v.conversionRate || 0,
        isControl: v.isControl,
      }));

    if (charData.length < 2) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
          <p>Not enough data to show comparison results.</p>
          <p className="text-sm mt-2">
            Add at least 2 variants and record impressions and conversions.
          </p>
        </div>
      );
    }

    return (
      <div className="h-64 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Conversion Rate %', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Bar dataKey="conversionRate" name="Conversion Rate">
              {charData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isControl ? "#8884d8" : "#82ca9d"} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  if (isLoading) {
    return <div className="flex justify-center p-6">Loading variants...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500 p-6">
        Error loading variants: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>A/B Testing</span>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Variant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Message Variant</DialogTitle>
                <DialogDescription>
                  Create a new message variant to test against others.
                </DialogDescription>
              </DialogHeader>
              <CreateVariantForm />
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Test different message variations to improve conversion rates.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {variants.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <BrainCircuit className="mb-2 h-8 w-8" />
            <h3 className="font-medium">No message variants yet</h3>
            <p className="text-sm mt-2">
              Create variants to test different messages for this campaign.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {variants.map((variant) => (
                <div 
                  key={variant.id} 
                  className={`p-4 rounded-lg border ${variant.isControl ? 'border-purple-200 bg-purple-50' : 'border-gray-200'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium flex items-center">
                        {variant.variantName}
                        {variant.isControl && (
                          <Badge variant="outline" className="ml-2">
                            Control
                          </Badge>
                        )}
                      </h4>
                      <p className="text-sm mt-1">{variant.message}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Impressions</p>
                      <p className="font-medium">{variant.impressions || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Conversions</p>
                      <p className="font-medium">{variant.conversions || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Rate</p>
                      <p className="font-medium">{variant.conversionRate || 0}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <TestResultsChart variants={variants} />
          </>
        )}
      </CardContent>

      <CardFooter className="border-t p-4 text-sm text-muted-foreground">
        <p>
          A/B testing helps optimize your messaging by comparing performance across different variants.
        </p>
      </CardFooter>
    </Card>
  );
}