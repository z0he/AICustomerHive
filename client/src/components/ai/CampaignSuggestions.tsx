import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Copy, CheckCheck, Sparkles } from 'lucide-react';

// Sample audience segments for the dropdown
const audienceSegments = [
  { id: 'new_customers', name: 'New Customers' },
  { id: 'inactive_6months', name: 'Inactive (6+ months)' },
  { id: 'loyal_customers', name: 'Loyal Customers & VIPs' },
  { id: 'seasonal_buyers', name: 'Seasonal Buyers' },
  { id: 'industry_professionals', name: 'Industry Professionals' },
  { id: 'high_value_prospects', name: 'High-Value Prospects' },
];

export function CampaignSuggestions() {
  const [campaignGoal, setCampaignGoal] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!campaignGoal.trim()) {
      toast({
        title: "Campaign Goal Required",
        description: "Please describe your campaign goal",
        variant: "destructive"
      });
      return;
    }

    if (!targetAudience) {
      toast({
        title: "Target Audience Required",
        description: "Please select a target audience segment",
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    setSuggestions([]);

    try {
      const response = await fetch('/api/ai/campaign-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignGoal,
          targetAudience: audienceSegments.find(segment => segment.id === targetAudience)?.name || targetAudience
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }

      const data = await response.json();
      
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error getting campaign suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to generate campaign suggestions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      toast({
        title: "Copied!",
        description: "Campaign message copied to clipboard",
      });
      
      // Reset the copied status after 2 seconds
      setTimeout(() => {
        setCopiedIndex(null);
      }, 2000);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Campaign Suggestions
          </CardTitle>
          <CardDescription>
            Let AI help you create compelling campaign messages tailored to your audience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal">Campaign Goal</Label>
              <Textarea
                id="goal"
                placeholder="Describe your campaign goal (e.g., 'Increase engagement with inactive customers' or 'Promote our new service offering')"
                value={campaignGoal}
                onChange={(e) => setCampaignGoal(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">Target Audience</Label>
              <Select value={targetAudience} onValueChange={setTargetAudience}>
                <SelectTrigger>
                  <SelectValue placeholder="Select audience segment" />
                </SelectTrigger>
                <SelectContent>
                  {audienceSegments.map((segment) => (
                    <SelectItem key={segment.id} value={segment.id}>
                      {segment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleGenerate} 
            disabled={isLoading || !campaignGoal.trim() || !targetAudience}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating suggestions...
              </>
            ) : (
              <>Generate Campaign Suggestions</>
            )}
          </Button>
        </CardFooter>
      </Card>

      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Suggested Campaign Messages</CardTitle>
            <CardDescription>
              Select a suggestion to use in your campaign or as inspiration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <div 
                  key={index} 
                  className="p-4 border rounded-lg relative hover:shadow-md transition-shadow"
                >
                  <p className="pr-10">{suggestion}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => handleCopy(suggestion, index)}
                  >
                    {copiedIndex === index ? (
                      <CheckCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CampaignSuggestions;