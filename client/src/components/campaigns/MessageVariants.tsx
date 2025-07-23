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
import { BrainCircuit, Plus, TrendingUp, Eye, MousePointer, Trash2, Settings, Award, Beaker, Split } from "lucide-react";

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
      return apiRequest('POST', `/api/campaigns/${campaignId}/variants`, newVariant);
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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      const token = localStorage.getItem("auth_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/variants/${variantId}/stats`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ impressions, conversions }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update variant stats');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId, 'variants'] });
      toast({
        title: "Stats updated",
        description: "Variant statistics have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update stats",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Function to simulate adding test data for demo purposes
  const addTestDataMutation = useMutation({
    mutationFn: async (variantId: number) => {
      const impressions = Math.floor(Math.random() * 500) + 100;
      const conversions = Math.floor(Math.random() * impressions * 0.2);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      const token = localStorage.getItem("auth_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/variants/${variantId}/stats`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ impressions, conversions }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update variant stats');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId, 'variants'] });
      toast({
        title: "Test data added",
        description: "Sample performance data has been added to this variant.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add test data",
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
    const chartData = variants
      .filter(v => v.impressions && v.impressions > 0)
      .map(v => ({
        name: v.variantName,
        conversionRate: v.conversionRate || 0,
        impressions: v.impressions || 0,
        conversions: v.conversions || 0,
        isControl: v.isControl,
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate);

    if (chartData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-50 rounded-lg mt-6">
          <BarChart className="h-8 w-8 mb-3 text-slate-300" />
          <h3 className="font-medium text-slate-700 mb-1">No Performance Data Yet</h3>
          <p className="text-sm">
            Add test data to your variants to see performance comparisons and insights.
          </p>
        </div>
      );
    }

    if (chartData.length < 2) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 bg-slate-50 rounded-lg mt-6">
          <TrendingUp className="h-8 w-8 mb-3 text-slate-300" />
          <h3 className="font-medium text-slate-700 mb-1">Need More Variants</h3>
          <p className="text-sm">
            Add at least 2 variants with performance data to see A/B test comparisons.
          </p>
        </div>
      );
    }

    const winner = chartData[0];
    const controlVariant = chartData.find(v => v.isControl);
    const improvementPercentage = controlVariant && winner !== controlVariant
      ? Math.round(((winner.conversionRate - controlVariant.conversionRate) / controlVariant.conversionRate) * 100)
      : 0;

    return (
      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-slate-900">Performance Comparison</h3>
          {improvementPercentage > 0 && (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              <TrendingUp className="w-3 h-3 mr-1" />
              +{improvementPercentage}% improvement
            </Badge>
          )}
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                label={{ value: 'Conversion Rate (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 12, fill: '#64748b' } }}
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <Tooltip 
                formatter={(value: any, name: any, props: any) => [
                  `${value}%`,
                  'Conversion Rate'
                ]}
                labelFormatter={(label: any) => `Variant: ${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="conversionRate" name="Conversion Rate" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={
                      entry.isControl ? "#8b5cf6" : 
                      index === 0 ? "#10b981" : "#3b82f6"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Winner summary */}
        {winner && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-emerald-900">Best Performing Variant</span>
            </div>
            <div className="text-sm text-emerald-700">
              <p className="font-medium">{winner.name}</p>
              <p className="mt-1">
                {winner.conversionRate}% conversion rate • {winner.conversions} conversions from {winner.impressions} impressions
              </p>
            </div>
          </div>
        )}
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
          <div className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-purple-600" />
            <span>A/B Testing</span>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Variant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Message Variant</DialogTitle>
                <DialogDescription>
                  Create a new message variant to test against others. Each variant will be tested to determine which performs better.
                </DialogDescription>
              </DialogHeader>
              <CreateVariantForm />
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Test different message variations to improve conversion rates. Compare performance and identify the most effective messaging.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {variants.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-100">
            <div className="bg-white p-3 rounded-full shadow-sm mb-4">
              <Split className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="font-medium text-slate-700 mb-2">Start A/B Testing</h3>
            <p className="text-sm text-slate-600 max-w-sm">
              Create multiple message variants to test which performs better with your audience. A/B testing can improve your conversion rates by up to 30%.
            </p>
            <div className="mt-4 p-3 bg-white rounded-md border text-xs text-slate-500">
              💡 <strong>Pro tip:</strong> Test one element at a time (subject line, tone, call-to-action) for clearer insights.
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {variants.map((variant) => (
                <div 
                  key={variant.id} 
                  className={`p-4 rounded-lg border transition-all ${
                    variant.isControl 
                      ? 'border-purple-200 bg-purple-50 shadow-purple-100' 
                      : 'border-slate-200 bg-white hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-slate-900">{variant.variantName}</h4>
                        {variant.isControl && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                            <Award className="w-3 h-3 mr-1" />
                            Control
                          </Badge>
                        )}
                      </div>
                      <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-700 border">
                        {variant.message}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addTestDataMutation.mutate(variant.id)}
                        disabled={addTestDataMutation.isPending}
                        className="text-xs"
                      >
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Add Test Data
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="bg-white p-3 rounded-md border">
                      <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <Eye className="w-4 h-4" />
                        <span className="text-xs font-medium">Impressions</span>
                      </div>
                      <p className="text-lg font-semibold text-slate-900">{variant.impressions || 0}</p>
                    </div>
                    <div className="bg-white p-3 rounded-md border">
                      <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <MousePointer className="w-4 h-4" />
                        <span className="text-xs font-medium">Conversions</span>
                      </div>
                      <p className="text-lg font-semibold text-slate-900">{variant.conversions || 0}</p>
                    </div>
                    <div className="bg-white p-3 rounded-md border">
                      <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-medium">Conv. Rate</span>
                      </div>
                      <p className={`text-lg font-semibold ${
                        (variant.conversionRate || 0) > 0 ? 'text-emerald-600' : 'text-slate-900'
                      }`}>
                        {variant.conversionRate || 0}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Performance indicator */}
                  {variant.impressions && variant.impressions > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Performance Status:</span>
                        <span className={`font-medium ${
                          (variant.conversionRate || 0) > 5 ? 'text-emerald-600' :
                          (variant.conversionRate || 0) > 2 ? 'text-yellow-600' : 'text-slate-600'
                        }`}>
                          {(variant.conversionRate || 0) > 5 ? 'Excellent' :
                           (variant.conversionRate || 0) > 2 ? 'Good' : 'Needs Improvement'}
                        </span>
                      </div>
                    </div>
                  )}
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