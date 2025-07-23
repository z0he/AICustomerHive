import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";

// Components
import AuthHeader from "@/components/auth/AuthHeader";
import Sidebar from "@/components/layout/Sidebar";
import LeadForm from "@/components/leads/LeadForm";
import LeadDetails from "@/components/leads/LeadDetails";
import LeadScoringCard from "@/components/leads/LeadScoringCard";
import LeadStatusFilter from "@/components/leads/LeadStatusFilter";
import { LeadVisualization } from "@/components/leads/LeadVisualization";
import CustomerSegmentation from "@/components/leads/CustomerSegmentation";
import LeadScoringAlgorithm from "@/components/leads/LeadScoringAlgorithm";
import WorkflowAutomation from "@/components/leads/WorkflowAutomation";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  UserPlus, 
  Filter, 
  Search, 
  PlusCircle, 
  ArrowUpDown, 
  Tag, 
  Clock, 
  UserCheck,
  BarChart4
} from "lucide-react";

// Types
import { Lead } from "@shared/schema";

export default function LeadManagement() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // States
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [showAddLeadDialog, setShowAddLeadDialog] = useState(false);
  const [sortField, setSortField] = useState<string>("score");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [activeTab, setActiveTab] = useState("leads");
  
  // API queries
  const { 
    data: leads = [], 
    isLoading: isLoadingLeads,
    error: leadsError,
    refetch: refetchLeads
  } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    retry: 1
  });
  
  const { 
    data: topLeads = [], 
    isLoading: isLoadingTopLeads 
  } = useQuery<Lead[]>({
    queryKey: ["/api/leads/top"],
    retry: 1
  });
  
  const { 
    data: recentCampaigns = [], 
    isLoading: isLoadingCampaigns 
  } = useQuery<any[]>({
    queryKey: ["/api/campaigns/recent"],
    retry: 1
  });
  
  const { 
    data: selectedLead,
    isLoading: isLoadingSelectedLead
  } = useQuery<Lead>({
    queryKey: [`/api/leads/${selectedLeadId}`],
    enabled: !!selectedLeadId,
    retry: 1
  });
  
  // Get leads by status
  const { 
    data: filteredLeads = [], 
    isLoading: isLoadingFilteredLeads,
    refetch: refetchFilteredLeads
  } = useQuery<Lead[]>({
    queryKey: ["/api/leads", { status: filterStatus !== "all" ? filterStatus : undefined, source: filterSource !== "all" ? filterSource : undefined }],
    enabled: filterStatus !== "all" || filterSource !== "all",
    retry: 1
  });
  
  // Mutations
  const createLeadMutation = useMutation({
    mutationFn: (leadData: any) => {
      return apiRequest('POST', '/api/leads', leadData);
    },
    onSuccess: () => {
      toast({
        title: "Lead created",
        description: "New lead has been successfully added"
      });
      
      // Close the dialog and refetch leads
      setShowAddLeadDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/top"] });
    },
    onError: (error) => {
      console.error("Failed to create lead:", error);
      toast({
        title: "Error",
        description: "Failed to create lead. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const updateLeadScoreMutation = useMutation({
    mutationFn: ({ id, scoringData }: { id: number, scoringData: any }) => {
      return apiRequest('POST', `/api/leads/${id}/score`, scoringData);
    },
    onSuccess: () => {
      toast({
        title: "Lead score updated",
        description: "Lead score has been successfully updated"
      });
      
      // Refetch lead data
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/top"] });
      if (selectedLeadId) {
        queryClient.invalidateQueries({ queryKey: [`/api/leads/${selectedLeadId}`] });
      }
    },
    onError: (error) => {
      console.error("Failed to update lead score:", error);
      toast({
        title: "Error",
        description: "Failed to update lead score. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const updateLeadMutation = useMutation({
    mutationFn: ({ id, leadData }: { id: number, leadData: any }) => {
      return apiRequest('PATCH', `/api/leads/${id}`, leadData);
    },
    onSuccess: () => {
      toast({
        title: "Lead updated",
        description: "Lead has been successfully updated"
      });
      
      // Refetch lead data
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      if (selectedLeadId) {
        queryClient.invalidateQueries({ queryKey: [`/api/leads/${selectedLeadId}`] });
      }
    },
    onError: (error) => {
      console.error("Failed to update lead:", error);
      toast({
        title: "Error",
        description: "Failed to update lead. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const addLeadNoteMutation = useMutation({
    mutationFn: ({ id, note }: { id: number, note: string }) => {
      return apiRequest('POST', `/api/leads/${id}/notes`, { note });
    },
    onSuccess: () => {
      toast({
        title: "Note added",
        description: "Lead note has been successfully added"
      });
      
      // Refetch lead data
      if (selectedLeadId) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads", selectedLeadId] });
      }
    },
    onError: (error) => {
      console.error("Failed to add lead note:", error);
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const assignLeadOwnerMutation = useMutation({
    mutationFn: ({ id, ownerName }: { id: number, ownerName: string }) => {
      return apiRequest('POST', `/api/leads/${id}/owner`, { ownerName });
    },
    onSuccess: () => {
      toast({
        title: "Owner assigned",
        description: "Lead owner has been successfully assigned"
      });
      
      // Refetch lead data
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      if (selectedLeadId) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads", selectedLeadId] });
      }
    },
    onError: (error) => {
      console.error("Failed to assign lead owner:", error);
      toast({
        title: "Error",
        description: "Failed to assign owner. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Helper function to handle lead filtering and sorting
  const getFilteredAndSortedLeads = (): Lead[] => {
    // Determine which leads array to use
    let leadsToProcess: Lead[] = (filterStatus !== "all" || filterSource !== "all") 
      ? filteredLeads 
      : leads;
      
    // Apply search filter if there's a search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      leadsToProcess = leadsToProcess.filter((lead: Lead) => 
        lead.name?.toLowerCase().includes(query) ||
        lead.industry?.toLowerCase().includes(query) ||
        (lead.company && lead.company.toLowerCase().includes(query)) ||
        (lead.email && lead.email.toLowerCase().includes(query))
      );
    }
    
    // Apply sorting
    return [...leadsToProcess].sort((a: Lead, b: Lead) => {
      let valueA = a[sortField as keyof Lead];
      let valueB = b[sortField as keyof Lead];
      
      // Handle null/undefined values
      if (valueA === null || valueA === undefined) valueA = sortField === "score" ? 0 : "";
      if (valueB === null || valueB === undefined) valueB = sortField === "score" ? 0 : "";
      
      // Compare based on type
      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      } else {
        const strA = String(valueA).toLowerCase();
        const strB = String(valueB).toLowerCase();
        return sortDirection === "asc" 
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
      }
    });
  };
  
  // Get filtered and sorted leads
  const filteredAndSortedLeads = getFilteredAndSortedLeads();
  
  // Handle sort toggle
  const handleSortToggle = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };
  
  // Handle filter changes
  const handleFilterChange = (type: string, value: string) => {
    if (type === "status") {
      setFilterStatus(value);
    } else if (type === "source") {
      setFilterSource(value);
    }
  };
  
  // Handle lead selection
  const handleLeadClick = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setIsDetailsOpen(true);
  };
  
  // Create mock lead owners for demo
  const leadOwners = [
    { id: 1, name: "John Doe" },
    { id: 2, name: "Jane Smith" },
    { id: 3, name: "Robert Johnson" },
    { id: 4, name: "Emily Williams" },
  ];
  
  // We already have selectedLead from the query above
  
  // Create lead sources for dropdown
  const leadSources = [
    { id: "all", name: "All Sources" },
    { id: "website", name: "Website" },
    { id: "referral", name: "Referral" },
    { id: "advertisement", name: "Advertisement" },
    { id: "social_media", name: "Social Media" },
    { id: "email", name: "Email" },
    { id: "event", name: "Event" },
    { id: "partner", name: "Partner" },
    { id: "other", name: "Other" },
  ];
  
  // Create lead statuses for dropdown
  const leadStatuses = [
    { id: "all", name: "All Statuses" },
    { id: "new", name: "New" },
    { id: "contacted", name: "Contacted" },
    { id: "qualified", name: "Qualified" },
    { id: "proposal", name: "Proposal" },
    { id: "negotiation", name: "Negotiation" },
    { id: "won", name: "Won" },
    { id: "lost", name: "Lost" },
  ];
  
  // Helper to format timestamp
  const formatDate = (timestamp: string | Date) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };
  
  return (
    <div className="bg-slate-50 text-slate-800 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <AuthHeader 
        user={{ id: 1, name: "John Doe", initials: "JD" }} 
        notifications={[]} 
        onLogout={() => {}} 
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar recentCampaigns={recentCampaigns || []} />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Lead Management</h1>
                <p className="text-slate-500 mt-1">Track, score, and nurture your leads effectively</p>
              </div>
              
              {activeTab === "leads" && (
                <div className="mt-4 md:mt-0">
                  <Dialog open={showAddLeadDialog} onOpenChange={setShowAddLeadDialog}>
                    <DialogTrigger asChild>
                      <Button className="h-10 flex items-center font-semibold">
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Add New Lead
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Add New Lead</DialogTitle>
                      </DialogHeader>
                      <LeadForm 
                        onSubmit={(data) => createLeadMutation.mutate(data)} 
                        isSubmitting={createLeadMutation.isPending} 
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="leads">Lead Management</TabsTrigger>
                <TabsTrigger value="segmentation">Customer Segmentation</TabsTrigger>
                <TabsTrigger value="scoring">Scoring Algorithm</TabsTrigger>
                <TabsTrigger value="automation">Workflow Automation</TabsTrigger>
              </TabsList>

              {/* Lead Management Tab */}
              <TabsContent value="leads" className="space-y-6">
            
            {/* Lead Analytics Visualization */}
            <div className="mb-6">
              <LeadVisualization leads={leads || []} />
            </div>
            
            {/* Lead Management Interface */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Left Column - Lead List */}
              <div className="xl:col-span-2 space-y-6">
                {/* Filters and Search */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                          <Input
                            type="search"
                            placeholder="Search leads..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-2 md:w-auto">
                        <Select value={filterSource} onValueChange={(value) => handleFilterChange("source", value)}>
                          <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="All Sources" />
                          </SelectTrigger>
                          <SelectContent>
                            {leadSources.map(source => (
                              <SelectItem key={source.id} value={source.id}>
                                {source.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select value={filterStatus} onValueChange={(value) => handleFilterChange("status", value)}>
                          <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            {leadStatuses.map(status => (
                              <SelectItem key={status.id} value={status.id}>
                                {status.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Lead Table */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>All Leads</CardTitle>
                    <CardDescription>
                      {filteredAndSortedLeads.length} leads • Click on a lead to view details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingLeads ? (
                      <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center gap-4 p-2">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-[250px]" />
                              <Skeleton className="h-4 w-[200px]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filteredAndSortedLeads.length === 0 ? (
                      <div className="text-center py-6 text-slate-500">
                        <p>No leads found matching your criteria</p>
                        <Button 
                          variant="link" 
                          onClick={() => {
                            setFilterStatus("all");
                            setFilterSource("all");
                            setSearchQuery("");
                          }}
                        >
                          Clear filters
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[250px]">
                                <Button 
                                  variant="ghost" 
                                  className="flex items-center hover:bg-transparent p-0"
                                  onClick={() => handleSortToggle("name")}
                                >
                                  Name
                                  {sortField === "name" && (
                                    <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === "asc" ? "transform rotate-180" : ""}`} />
                                  )}
                                </Button>
                              </TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">
                                <Button 
                                  variant="ghost" 
                                  className="flex items-center hover:bg-transparent p-0 ml-auto"
                                  onClick={() => handleSortToggle("score")}
                                >
                                  Score
                                  {sortField === "score" && (
                                    <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === "asc" ? "transform rotate-180" : ""}`} />
                                  )}
                                </Button>
                              </TableHead>
                              <TableHead className="text-right">Added</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredAndSortedLeads.map((lead) => (
                              <TableRow 
                                key={lead.id} 
                                className={`cursor-pointer ${selectedLeadId === lead.id ? 'bg-primary/5' : ''}`}
                                onClick={() => handleLeadClick(lead)}
                              >
                                <TableCell className="font-medium">
                                  <div className="flex items-center">
                                    <div className="bg-slate-100 text-slate-700 w-8 h-8 rounded-full flex items-center justify-center mr-3 font-semibold text-sm">
                                      {lead.initials}
                                    </div>
                                    <div>
                                      <div>{lead.name}</div>
                                      <div className="text-sm text-slate-500">
                                        {lead.company || lead.industry}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {lead.leadSource || "Unknown"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={
                                    lead.leadStatus === "qualified" ? "success" :
                                    lead.leadStatus === "contacted" ? "default" :
                                    lead.leadStatus === "lost" ? "destructive" :
                                    "secondary"
                                  }>
                                    {lead.leadStatus || "New"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end">
                                    <div 
                                      className="w-10 h-2 rounded bg-slate-200 mr-2 overflow-hidden"
                                      title={`Lead Score: ${lead.score || 0}`}
                                    >
                                      <div 
                                        className={`h-full ${
                                          (lead.score || 0) >= 75 ? "bg-green-500" :
                                          (lead.score || 0) >= 50 ? "bg-yellow-500" :
                                          "bg-orange-500"
                                        }`}
                                        style={{ width: `${lead.score || 0}%` }}
                                      />
                                    </div>
                                    <span className="font-medium">{lead.score || 0}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatDate(lead.createdAt)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Right Column - Selected Lead Details */}
              <div className="space-y-6">
                {/* Top Leads */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart4 className="h-5 w-5 mr-2" />
                      Top Scoring Leads
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTopLeads ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex justify-between items-center">
                            <Skeleton className="h-4 w-[150px]" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        ))}
                      </div>
                    ) : topLeads.length === 0 ? (
                      <div className="text-center py-4 text-slate-500">
                        <p>No leads available yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {topLeads.map((lead: Lead, index: number) => (
                          <div 
                            key={lead.id} 
                            className="flex justify-between items-center cursor-pointer hover:bg-slate-50 p-2 rounded-md"
                            onClick={() => handleLeadClick(lead)}
                          >
                            <div className="flex items-center">
                              <div className="bg-slate-100 text-slate-700 w-8 h-8 rounded-full flex items-center justify-center mr-3 font-semibold text-sm">
                                {lead.initials}
                              </div>
                              <div>
                                <div className="font-medium">{lead.name}</div>
                                <div className="text-sm text-slate-500">{lead.industry}</div>
                              </div>
                            </div>
                            <div className="text-sm font-semibold">
                              <div className="flex items-center">
                                <div 
                                  className={`w-2 h-2 rounded-full mr-2 ${
                                    (lead.score || 0) >= 75 ? "bg-green-500" :
                                    (lead.score || 0) >= 50 ? "bg-yellow-500" :
                                    "bg-orange-500"
                                  }`} 
                                />
                                {lead.score || 0}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Lead Status Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Tag className="h-5 w-5 mr-2" />
                      Lead Status Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LeadStatusFilter 
                      onFilterChange={(status) => setFilterStatus(status)} 
                      activeFilter={filterStatus}
                      leads={leads || []}
                    />
                  </CardContent>
                </Card>
                
                {/* Follow-up Reminders */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Upcoming Follow-ups
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {leads.filter(lead => lead.nextFollowUpDate).length === 0 ? (
                      <div className="text-center py-4 text-slate-500">
                        <p>No follow-ups scheduled</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {leads
                          .filter(lead => lead.nextFollowUpDate)
                          .sort((a, b) => new Date(a.nextFollowUpDate).getTime() - new Date(b.nextFollowUpDate).getTime())
                          .slice(0, 5)
                          .map(lead => (
                            <div 
                              key={lead.id} 
                              className="flex justify-between items-center cursor-pointer hover:bg-slate-50 p-2 rounded-md"
                              onClick={() => handleLeadClick(lead)}
                            >
                              <div className="flex items-center">
                                <div className="bg-slate-100 text-slate-700 w-8 h-8 rounded-full flex items-center justify-center mr-3 font-semibold text-sm">
                                  {lead.initials}
                                </div>
                                <div>
                                  <div className="font-medium">{lead.name}</div>
                                  <div className="text-sm text-slate-500">
                                    {formatDate(lead.nextFollowUpDate)}
                                  </div>
                                </div>
                              </div>
                              <Button variant="outline" size="sm">
                                Contact
                              </Button>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Lead Owner Assignment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <UserCheck className="h-5 w-5 mr-2" />
                      Lead Owners
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {leadOwners.map(owner => (
                        <div key={owner.id} className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="bg-slate-100 text-slate-700 w-8 h-8 rounded-full flex items-center justify-center mr-3 font-semibold text-sm">
                              {owner.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="font-medium">{owner.name}</div>
                          </div>
                          <Badge variant="outline">
                            {leads.filter((l: Lead) => l.leadOwner === owner.name).length} leads
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            </TabsContent>

              {/* Customer Segmentation Tab */}
              <TabsContent value="segmentation" className="space-y-6">
                <CustomerSegmentation />
              </TabsContent>

              {/* Lead Scoring Algorithm Tab */}
              <TabsContent value="scoring" className="space-y-6">
                <LeadScoringAlgorithm 
                  mode="global"
                  onScoreUpdate={(newScore, breakdown) => {
                    console.log("Global score update:", newScore, breakdown);
                  }}
                />
              </TabsContent>

              {/* Workflow Automation Tab */}
              <TabsContent value="automation" className="space-y-6">
                <WorkflowAutomation leads={leads || []} />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Lead Details Dialog */}
      {selectedLead && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lead Details</DialogTitle>
              <DialogDescription>
                View and manage lead information
              </DialogDescription>
            </DialogHeader>
            
            <LeadDetails 
              lead={selectedLead}
              onUpdateScore={(scoringData) => updateLeadScoreMutation.mutate({ 
                id: typeof selectedLead === 'object' && selectedLead !== null ? (selectedLead as any).id : 0, 
                scoringData 
              })}
              onUpdateLead={(leadData) => updateLeadMutation.mutate({ 
                id: typeof selectedLead === 'object' && selectedLead !== null ? (selectedLead as any).id : 0, 
                leadData 
              })}
              onAddNote={(note) => addLeadNoteMutation.mutate({ 
                id: typeof selectedLead === 'object' && selectedLead !== null ? (selectedLead as any).id : 0, 
                note 
              })}
              onAssignOwner={(ownerName) => assignLeadOwnerMutation.mutate({ 
                id: typeof selectedLead === 'object' && selectedLead !== null ? (selectedLead as any).id : 0, 
                ownerName 
              })}
              isUpdating={updateLeadMutation.isPending || updateLeadScoreMutation.isPending}
              leadOwners={leadOwners}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}