import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import AuthHeader from "@/components/auth/AuthHeader";

// Simple type for feedback items
interface FeedbackItem {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  type: string;
  metadata: {
    feedbackType: string;
    userEmail?: string;
    username?: string;
  };
}

export default function FeedbackList() {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  // Fetch all notifications and filter for feedback only
  const fetchFeedback = async () => {
    setIsLoading(true);
    try {
      const allNotifications = await apiRequest('GET', '/api/admin/notifications');
      console.log("All notifications:", allNotifications);
      
      if (Array.isArray(allNotifications)) {
        // Filter out only feedback notifications
        const feedbackOnly = allNotifications.filter(item => item.type === 'user_feedback');
        console.log("Feedback items:", feedbackOnly);
        setFeedbackItems(feedbackOnly);
      } else {
        console.error("Invalid notifications response:", allNotifications);
        setFeedbackItems([]);
      }
    } catch (error) {
      console.error("Error fetching feedback:", error);
      toast({
        title: "Error",
        description: "Failed to load feedback submissions",
        variant: "destructive"
      });
      setFeedbackItems([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load feedback on component mount
  useEffect(() => {
    fetchFeedback();
  }, []);
  
  // Create a mock user for the AuthHeader
  const mockUser = {
    id: 1,
    name: "Admin User",
    initials: "AU"
  };
  
  // Format the date for display
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'Unknown time';
    }
  };

  return (
    <div className="bg-slate-50 text-slate-800 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <AuthHeader 
        user={mockUser} 
        notifications={[]} 
        onLogout={() => {}} 
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar recentCampaigns={[]} />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-3 sm:space-y-0">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">User Feedback</h1>
                <p className="text-slate-500 mt-1">Review user feedback and suggestions</p>
              </div>
              
              <Button onClick={fetchFeedback} disabled={isLoading} variant="outline">
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            {/* Feedback List */}
            <div className="grid gap-4 mt-6">
              {isLoading ? (
                <p>Loading feedback...</p>
              ) : feedbackItems.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <MessageSquare className="h-16 w-16 text-slate-300 mb-4" />
                    <h3 className="text-xl font-medium text-slate-700 mb-2">No feedback yet</h3>
                    <p className="text-slate-500 text-center">
                      Feedback submissions from users will appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                feedbackItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardHeader className="pb-2 bg-slate-50">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <MessageSquare className="h-5 w-5 text-indigo-500 mr-2" />
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                        </div>
                        
                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
                          {item.metadata?.feedbackType || 'Feedback'}
                        </Badge>
                      </div>
                      <CardDescription>
                        {item.metadata?.username ? `From: ${item.metadata.username}` : 'Anonymous'} 
                        {item.metadata?.userEmail ? ` (${item.metadata.userEmail})` : ''}
                        <span className="ml-2 text-slate-400">• {formatDate(item.createdAt)}</span>
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="py-4">
                      <p className="whitespace-pre-line">{item.message}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}