import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Components
import AuthHeader from "@/components/auth/AuthHeader";
import Sidebar from "@/components/layout/Sidebar";
import { MessageVariants } from "@/components/campaigns/MessageVariants";
import CreateCampaignEmailModal from "@/components/email/CreateCampaignEmailModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Megaphone, 
  Calendar, 
  Users, 
  ChevronLeft, 
  BarChart, 
  BellRing,
  Mail,
  ExternalLink,
  Settings
} from "lucide-react";

// Types
import { Campaign } from "@shared/schema";

const CampaignDetail = () => {
  const [location] = useLocation();
  const { toast } = useToast();
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  
  // Extract campaign ID from URL
  const campaignId = parseInt(location.split("/").pop() || "0");
  
  // Queries
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/user'],
    staleTime: 300000 // 5 minutes
  });
  
  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications'],
    staleTime: 300000 // 5 minutes
  });
  
  const { data: recentCampaigns } = useQuery({
    queryKey: ['/api/campaigns/recent'],
    staleTime: 300000 // 5 minutes
  });
  
  // Fetch campaign details
  const { 
    data: campaign,
    isLoading: isLoadingCampaign,
    error: campaignError
  } = useQuery<Campaign>({
    queryKey: ['/api/campaigns', campaignId],
    queryFn: async () => {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch campaign");
      }
      return response.json();
    },
    enabled: !!campaignId,
  });
  
  // Determine campaign status
  const getCampaignStatus = (campaign: Campaign) => {
    const now = new Date();
    const startDate = new Date(campaign.startDate);
    const endDate = new Date(campaign.endDate);
    
    if (now < startDate) return "upcoming";
    if (now > endDate) return "completed";
    return "active";
  };
  
  // Logout handler
  const handleLogout = () => {
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    window.location.href = '/';
  };
  
  return (
    <div className="bg-slate-50 text-slate-800 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <AuthHeader 
        user={userData?.user || { id: 1, name: "John Doe", initials: "JD" }} 
        notifications={notifications || []} 
        onLogout={handleLogout}
      />
      
      <div className="flex-1 overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Back button and page title */}
            <div className="mb-6">
              <Link href="/campaigns">
                <Button variant="ghost" className="hover:bg-transparent p-0">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  <span>Back to Campaigns</span>
                </Button>
              </Link>
              
              {isLoadingCampaign ? (
                <Skeleton className="h-8 w-64 mt-2" />
              ) : campaignError ? (
                <h1 className="text-2xl font-bold text-slate-900 mt-2">Campaign not found</h1>
              ) : campaign ? (
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <div className="flex items-center">
                      <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
                      {campaign && (
                        <Badge 
                          className="ml-3"
                          variant={
                            getCampaignStatus(campaign) === "active" 
                              ? "default" 
                              : getCampaignStatus(campaign) === "completed" 
                                ? "secondary" 
                                : "outline"
                          }
                        >
                          {getCampaignStatus(campaign) === "active" 
                            ? "Active" 
                            : getCampaignStatus(campaign) === "completed" 
                              ? "Completed" 
                              : "Upcoming"
                          }
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-500 mt-1">
                      {campaign.type.charAt(0).toUpperCase() + campaign.type.slice(1)} campaign
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Button>
                    <Button size="sm" onClick={() => setIsEmailModalOpen(true)}>
                      <Mail className="mr-2 h-4 w-4" />
                      Create Email
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
            
            {/* Campaign Details */}
            {isLoadingCampaign ? (
              <div className="space-y-4">
                <Skeleton className="h-[200px] w-full" />
                <Skeleton className="h-[400px] w-full" />
              </div>
            ) : campaignError ? (
              <div className="text-center py-12 border rounded-lg bg-white">
                <Megaphone className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-3 text-lg font-medium text-slate-800">Campaign not found</h3>
                <p className="mt-2 text-sm text-slate-500">
                  The campaign you're looking for doesn't exist or you don't have access to it.
                </p>
                <Link href="/campaigns">
                  <Button className="mt-4">View All Campaigns</Button>
                </Link>
              </div>
            ) : campaign ? (
              <div className="space-y-6">
                {/* Summary Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Campaign Summary</CardTitle>
                    <CardDescription>
                      Overview of your campaign performance and settings
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium flex items-center text-slate-500">
                          <Calendar className="mr-2 h-4 w-4" />
                          Timeline
                        </h3>
                        <div className="text-sm">
                          <div className="flex justify-between mb-1">
                            <span>Start Date</span>
                            <span className="font-medium">{new Date(campaign.startDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>End Date</span>
                            <span className="font-medium">{new Date(campaign.endDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium flex items-center text-slate-500">
                          <Users className="mr-2 h-4 w-4" />
                          Target Audience
                        </h3>
                        <div className="text-sm space-y-1">
                          <div>
                            {campaign.targetAudience}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium flex items-center text-slate-500">
                          <BarChart className="mr-2 h-4 w-4" />
                          Performance
                        </h3>
                        <div className="text-sm">
                          <div className="flex justify-between mb-1">
                            <span>Conversions</span>
                            <span className="font-medium">{campaign.conversions || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Growth</span>
                            <span className="font-medium text-emerald-600">+{campaign.percentage || 0}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t">
                      <h3 className="text-sm font-medium mb-2">Original Message</h3>
                      <div className="bg-slate-50 p-3 rounded-md text-sm">{campaign.message}</div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Campaign A/B Testing Section */}
                <Tabs defaultValue="abTesting" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="abTesting">A/B Testing</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="audience">Audience</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="abTesting" className="space-y-4">
                    <MessageVariants 
                      campaignId={campaign.id} 
                      originalMessage={campaign.message} 
                    />
                  </TabsContent>
                  
                  <TabsContent value="performance" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Metrics</CardTitle>
                        <CardDescription>
                          Track the success of your campaign over time
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="h-[300px] flex items-center justify-center">
                        <div className="text-center p-6 text-slate-500">
                          <BarChart className="h-12 w-12 mx-auto text-slate-300" />
                          <h3 className="mt-2 font-medium">Performance data will appear here</h3>
                          <p className="text-sm mt-1">
                            Once your campaign has some activity, metrics will be displayed here
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="audience" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Audience Insights</CardTitle>
                        <CardDescription>
                          Understand how different segments engage with your campaign
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="h-[300px] flex items-center justify-center">
                        <div className="text-center p-6 text-slate-500">
                          <Users className="h-12 w-12 mx-auto text-slate-300" />
                          <h3 className="mt-2 font-medium">Audience data will appear here</h3>
                          <p className="text-sm mt-1">
                            As your campaign reaches different segments, insights will be displayed here
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            ) : null}
          </div>
        </main>
      </div>

      {/* New Email Creation Modal */}
      {campaign && (
        <CreateCampaignEmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          campaign={campaign}
        />
      )}
    </div>
  );
};

export default CampaignDetail;