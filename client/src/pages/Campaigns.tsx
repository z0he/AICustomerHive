import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Components
import AuthHeader from "@/components/auth/AuthHeader";
import Sidebar from "@/components/layout/Sidebar";
import CreateCampaignModal from "@/components/modals/CreateCampaignModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Megaphone, Plus, CalendarDays, Users, BarChart, Clock, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Types
import { Campaign } from "@shared/schema";

const CampaignCard = ({ campaign }: { campaign: Campaign }) => {
  // Calculate days remaining
  const endDate = new Date(campaign.endDate);
  const startDate = new Date(campaign.startDate);
  const now = new Date();
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Progress as percentage
  const progress = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
  
  // Campaign status
  let status = "active";
  if (now > endDate) {
    status = "completed";
  } else if (now < startDate) {
    status = "upcoming";
  }
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="bg-slate-50 p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Megaphone className="text-primary-500" size={18} />
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{campaign.name}</CardTitle>
                {campaign.isSample && (
                  <Badge variant="outline" className="text-xs py-0 h-5 bg-amber-50 border-amber-200 text-amber-700">
                    Sample
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Badge 
            variant={status === "active" ? "default" : status === "completed" ? "secondary" : "outline"}
          >
            {status === "active" ? "Active" : status === "completed" ? "Completed" : "Upcoming"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        <div className="flex flex-col space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center space-x-2 text-slate-600">
              <CalendarDays size={14} />
              <span>{new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-600">
              <Users size={14} />
              <span>Target: {campaign.targetAudience}</span>
            </div>
          </div>
          
          <div className="mt-2">
            <div className="flex justify-between mb-1 text-xs text-slate-500">
              <span>Progress</span>
              <span>{daysRemaining} days remaining</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          <div className="mt-2 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-sm text-slate-600">
                <BarChart size={14} className="mr-1 text-slate-400" />
                <span>{campaign.conversions || 0} conversions</span>
              </div>
              {campaign.percentage !== null && (
                <div className="flex items-center text-sm text-emerald-600">
                  <span>+{campaign.percentage}%</span>
                </div>
              )}
            </div>
            <Link href={`/campaigns/${campaign.id}`}>
              <Button variant="ghost" size="sm">View Details</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Campaigns = () => {
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch data
  const { data: userData } = useQuery({
    queryKey: ['/api/user/current'],
    staleTime: 300000 // 5 minutes
  });
  
  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications'],
    staleTime: 300000 // 5 minutes
  });
  
  const { data: campaigns, isLoading: isLoadingCampaigns } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns', filterPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns?period=${filterPeriod}`, {
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      
      return await res.json();
    }
  });
  
  const { data: recentCampaigns } = useQuery({
    queryKey: ['/api/campaigns/recent'],
    staleTime: 300000 // 5 minutes
  });
  
  // Campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      return await apiRequest('POST', '/api/campaigns', campaignData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['/api/campaigns']});
      queryClient.invalidateQueries({queryKey: ['/api/campaigns/recent']});
      toast({
        title: "Campaign created",
        description: "Your campaign has been created successfully",
      });
    },
  });
  
  // Modal handlers
  const openCampaignModal = () => {
    setIsCampaignModalOpen(true);
  };
  
  const closeCampaignModal = () => {
    setIsCampaignModalOpen(false);
  };
  
  const createCampaign = (data: any) => {
    const formattedData = {
      name: data.name,
      type: data.type,
      targetAudience: data.targetAudience,
      message: data.message,
      startDate: data.startDate,
      endDate: data.endDate,
      // These would be calculated or set on the server in a real app
      conversions: 0,
      percentage: 0
    };
    
    createCampaignMutation.mutate(formattedData);
    closeCampaignModal();
  };
  

  
  // Filter campaigns based on active tab
  const filteredCampaigns = campaigns?.filter(campaign => {
    // Apply tab filter
    if (activeTab !== "all") {
      const now = new Date();
      const startDate = new Date(campaign.startDate);
      const endDate = new Date(campaign.endDate);
      
      if (activeTab === "active" && (now < startDate || now > endDate)) {
        return false;
      }
      if (activeTab === "upcoming" && now >= startDate) {
        return false;
      }
      if (activeTab === "completed" && now <= endDate) {
        return false;
      }
    }
    
    // Apply type filter
    if (filterType !== "all" && campaign.type !== filterType) {
      return false;
    }
    
    return true;
  });
  
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
        user={userData || { id: 1, name: "John Doe", initials: "JD" }} 
        notifications={notifications || []} 
        onLogout={handleLogout} 
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar recentCampaigns={recentCampaigns || []} />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
                <p className="text-slate-500 mt-1">Create and manage your marketing campaigns</p>
              </div>
              <Button 
                onClick={openCampaignModal}
                className="flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>New Campaign</span>
              </Button>
            </div>
            
            {/* Filters and Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 mb-5">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex space-x-2 w-full sm:w-auto">
                <div className="w-1/2 sm:w-auto">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <div className="flex items-center">
                        <Filter size={14} className="mr-2" />
                        <span>Type</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="nurture">Nurture</SelectItem>
                      <SelectItem value="promotional">Promotional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-1/2 sm:w-auto">
                  <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <div className="flex items-center">
                        <Clock size={14} className="mr-2" />
                        <span>Time Period</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="1y">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Campaign List */}
            {isLoadingCampaigns ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {[1, 2, 3, 4, 5, 6].map((_, idx) => (
                  <Card key={idx} className="h-[220px] animate-pulse">
                    <CardHeader className="bg-slate-100 p-4 pb-2 h-[70px]" />
                    <CardContent className="p-4 space-y-3">
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                      <div className="h-4 bg-slate-100 rounded w-1/2" />
                      <div className="h-2 bg-slate-100 rounded w-full" />
                      <div className="h-6 bg-slate-100 rounded w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredCampaigns && filteredCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {filteredCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Megaphone className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-3 text-lg font-medium text-slate-800">No campaigns found</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {filterType !== "all" || filterPeriod !== "all" || activeTab !== "all" 
                    ? "Try changing your filters or creating a new campaign" 
                    : "Get started by creating your first campaign"}
                </p>
                <Button 
                  onClick={openCampaignModal}
                  className="mt-4"
                >
                  Create Campaign
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Create Campaign Modal */}
      <CreateCampaignModal
        isOpen={isCampaignModalOpen}
        onCreateCampaign={createCampaign}
        onClose={closeCampaignModal}
      />
    </div>
  );
};

export default Campaigns;