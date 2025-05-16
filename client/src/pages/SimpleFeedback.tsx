import React, { useEffect, useState } from "react";
import { MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Simple feedback display component
export default function SimpleFeedback() {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const loadFeedback = async () => {
    setIsLoading(true);
    try {
      // Make a direct fetch to avoid any issues with React Query
      const response = await fetch('/api/feedback/list');
      
      if (!response.ok) {
        throw new Error(`Error fetching feedback: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Feedback data:", data);
      setFeedback(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load feedback:", error);
      toast({
        title: "Error loading feedback",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
      setFeedback([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadFeedback();
  }, []);
  
  // Format the date
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'Unknown time';
    }
  };
  
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">User Feedback</h1>
          <p className="text-slate-500">View feedback submitted by users</p>
        </div>
        
        <Button 
          onClick={loadFeedback} 
          disabled={isLoading}
          variant="outline"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center my-8">
          <div className="animate-pulse">Loading feedback...</div>
        </div>
      ) : feedback.length === 0 ? (
        <Card className="text-center p-8">
          <CardContent className="pt-6">
            <MessageSquare className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h2 className="text-xl font-medium">No feedback yet</h2>
            <p className="text-slate-500 mt-2">
              Any feedback submitted through the feedback button will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {feedback.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="bg-slate-50 pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-medium">{item.title}</CardTitle>
                  
                  <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
                    {item.metadata?.feedbackType || 'Feedback'}
                  </Badge>
                </div>
                <div className="text-sm text-slate-500">
                  {item.metadata?.username && (
                    <span>From: {item.metadata.username}</span>
                  )}
                  {item.metadata?.userEmail && (
                    <span> ({item.metadata.userEmail})</span>
                  )}
                  <span className="ml-2">• {formatDate(item.createdAt)}</span>
                </div>
              </CardHeader>
              
              <CardContent className="pt-4">
                <p className="whitespace-pre-line">{item.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}