import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Lightbulb, 
  TrendingUp, 
  Users, 
  RefreshCcw, 
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

type InsightData = {
  insights: string[];
  recommendations: string[];
};

export function CustomerInsights() {
  const [isExpanded, setIsExpanded] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Fetch customer insights data
  const { 
    data: insightData, 
    isLoading, 
    isError, 
    refetch, 
    isFetching 
  } = useQuery({
    queryKey: ['/api/ai/insights'],
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: false, // Don't auto-refresh as OpenAI calls can be expensive
  });

  // Toggle expansion state for an item
  const toggleExpand = (id: string) => {
    setIsExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Handle manual refresh
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshing Insights",
      description: "Analyzing your latest customer data..."
    });
  };

  // Format insights with icons
  const insightTypes = [
    { icon: <TrendingUp className="h-5 w-5" />, text: 'engagement trends' },
    { icon: <Users className="h-5 w-5" />, text: 'customer segments' }
  ];

  // Get a random icon for an insight
  const getIconForInsight = (text: string, index: number) => {
    // Simple way to assign icons semi-consistently
    const iconIndex = index % insightTypes.length;
    return insightTypes[iconIndex].icon;
  };

  if (isError) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-500">Unable to Load Insights</CardTitle>
          <CardDescription>
            There was a problem analyzing your customer data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>We couldn't generate AI insights at this time. This could be due to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Connection issues with our AI service</li>
            <li>Insufficient customer data for analysis</li>
            <li>A temporary service interruption</li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                AI Customer Insights
              </CardTitle>
              <CardDescription>
                AI-powered analysis of your customer data to identify patterns and opportunities
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={isLoading || isFetching}
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {isLoading || isFetching ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">Analyzing your customer data...</p>
            </div>
          ) : insightData ? (
            <>
              {/* Key Insights Section */}
              <div>
                <h3 className="text-lg font-medium mb-3">Key Insights</h3>
                <div className="space-y-3">
                  {insightData.insights.map((insight, index) => (
                    <div 
                      key={`insight-${index}`}
                      className="p-3 rounded-lg bg-muted/50 flex gap-3 items-start"
                    >
                      <div className="mt-0.5 text-primary">
                        {getIconForInsight(insight, index)}
                      </div>
                      <div>
                        <p>{insight}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              {/* Recommendations Section */}
              <div>
                <h3 className="text-lg font-medium mb-3">Strategic Recommendations</h3>
                <div className="space-y-3">
                  {insightData.recommendations.map((recommendation, index) => {
                    const id = `recommendation-${index}`;
                    const isItemExpanded = isExpanded[id] || false;
                    
                    // For simplicity, we'll create a simple short version
                    const shortVersion = recommendation.length > 90 
                      ? recommendation.substring(0, 90) + '...' 
                      : recommendation;
                    
                    return (
                      <div 
                        key={id}
                        className="p-3 rounded-lg border border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(id)}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className={isItemExpanded ? '' : 'line-clamp-2'}>
                            {recommendation}
                          </p>
                          <Button variant="ghost" size="icon" className="shrink-0">
                            {isItemExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No insights available. Try refreshing or adding more customer data.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CustomerInsights;