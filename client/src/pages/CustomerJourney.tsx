import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Components
import AuthHeader from "@/components/auth/AuthHeader";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import JourneyVisualization from "@/components/journey/JourneyVisualization";
import TouchpointAnalytics from "@/components/journey/TouchpointAnalytics";
import CustomerJourneyMap from "@/components/journey/CustomerJourneyMap";
import JourneyStageManager from "@/components/journey/JourneyStageManager";

// Icons
import { 
  Route, 
  Users, 
  TrendingUp, 
  Clock, 
  Target,
  Map,
  BarChart3,
  Settings,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";

// Shared types
import { Customer, Lead, CustomerTouchpoint, JourneyStage } from "@shared/schema";

export default function CustomerJourney() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [timeRange, setTimeRange] = useState("30d");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch customers data
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    retry: 1
  });

  // Fetch leads data
  const { data: leads = [], isLoading: isLoadingLeads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    retry: 1
  });

  // Fetch touchpoints data
  const { data: touchpoints = [], isLoading: isLoadingTouchpoints } = useQuery<CustomerTouchpoint[]>({
    queryKey: ["/api/customer-touchpoints"],
    retry: 1
  });

  // Fetch journey stages
  const { data: journeyStages = [], isLoading: isLoadingStages } = useQuery<JourneyStage[]>({
    queryKey: ["/api/journey-stages"],
    retry: 1
  });

  // Calculate journey metrics
  const journeyMetrics = useMemo(() => {
    const totalCustomers = customers.length;
    const totalLeads = leads.length;
    const totalTouchpoints = touchpoints.length;
    
    // Calculate average journey length
    const customerJourneys = customers.map(customer => {
      const customerTouchpoints = touchpoints.filter(t => t.customerId === customer.id);
      return customerTouchpoints.length;
    });
    
    const avgTouchpoints = customerJourneys.length > 0 
      ? customerJourneys.reduce((a, b) => a + b, 0) / customerJourneys.length 
      : 0;
    
    // Calculate conversion rate
    const conversionRate = totalLeads > 0 ? (totalCustomers / totalLeads) * 100 : 0;
    
    // Calculate most common touchpoint type
    const touchpointTypes = touchpoints.reduce((acc, t) => {
      acc[t.touchpointType] = (acc[t.touchpointType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonTouchpoint = Object.entries(touchpointTypes)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || "None";

    return {
      totalCustomers,
      totalLeads,
      totalTouchpoints,
      avgTouchpoints: Math.round(avgTouchpoints * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
      mostCommonTouchpoint
    };
  }, [customers, leads, touchpoints]);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.company?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customers, searchQuery]);

  if (isLoadingCustomers || isLoadingLeads || isLoadingTouchpoints || isLoadingStages) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AuthHeader />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="animate-pulse h-4 bg-slate-200 rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="animate-pulse space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-full"></div>
                      <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AuthHeader />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center">
                  <Route className="mr-3 h-8 w-8 text-primary" />
                  Customer Journey Mapping
                </h1>
                <p className="text-slate-500 mt-1">
                  Visualize and analyze customer touchpoints across their entire journey
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 3 months</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Journey Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{journeyMetrics.totalCustomers}</div>
                <p className="text-xs text-muted-foreground">
                  Active customer journeys
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Touchpoints</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{journeyMetrics.totalTouchpoints}</div>
                <p className="text-xs text-muted-foreground">
                  Across all customers
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Journey Length</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{journeyMetrics.avgTouchpoints}</div>
                <p className="text-xs text-muted-foreground">
                  Touchpoints per customer
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{journeyMetrics.conversionRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Lead to customer
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center">
                <Map className="mr-2 h-4 w-4" />
                Journey Map
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center">
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="visualization" className="flex items-center">
                <Route className="mr-2 h-4 w-4" />
                Visualization
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Stages
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Customer Journey Map */}
                <div className={selectedCustomer ? "lg:col-span-2" : "lg:col-span-3"}>
                  <CustomerJourneyMap 
                    customers={filteredCustomers}
                    touchpoints={touchpoints}
                    journeyStages={journeyStages}
                    onCustomerSelect={setSelectedCustomer}
                    selectedCustomer={selectedCustomer}
                  />
                </div>
                
                {/* Customer Details Panel */}
                {selectedCustomer && (
                  <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Customer Details</CardTitle>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSelectedCustomer(null)}
                          >
                            ×
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Customer Info */}
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {selectedCustomer.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{selectedCustomer.name}</h3>
                            <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                            {selectedCustomer.company && (
                              <p className="text-sm text-gray-500">{selectedCustomer.company}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Customer Touchpoints Summary */}
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-3">Journey Progress</h4>
                          {(() => {
                            const customerTouchpoints = touchpoints.filter(t => t.customerId === selectedCustomer.id);
                            const stageCount = customerTouchpoints.reduce((acc, t) => {
                              acc[t.touchpointStage] = (acc[t.touchpointStage] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>);
                            
                            return (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Total Touchpoints:</span>
                                  <span className="font-semibold">{customerTouchpoints.length}</span>
                                </div>
                                {Object.entries(stageCount).map(([stage, count]) => (
                                  <div key={stage} className="flex justify-between text-sm">
                                    <span className="capitalize">{stage}:</span>
                                    <span>{count}</span>
                                  </div>
                                ))}
                                {customerTouchpoints.length > 0 && (
                                  <div className="flex justify-between text-sm border-t pt-2 mt-2">
                                    <span>Last Activity:</span>
                                    <span className="text-xs">
                                      {format(new Date(customerTouchpoints[customerTouchpoints.length - 1]?.createdAt || new Date()), "MMM d, yyyy")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        
                        {/* Recent Touchpoints */}
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-3">Recent Activity</h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {touchpoints
                              .filter(t => t.customerId === selectedCustomer.id)
                              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                              .slice(0, 5)
                              .map((touchpoint, index) => (
                                <div key={index} className="flex items-start space-x-2 text-sm">
                                  <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-gray-900 truncate">{touchpoint.description}</p>
                                    <p className="text-gray-500 text-xs">
                                      {format(new Date(touchpoint.createdAt), "MMM d, h:mm a")}
                                    </p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <TouchpointAnalytics 
                touchpoints={touchpoints}
                customers={customers}
                timeRange={timeRange}
              />
            </TabsContent>

            <TabsContent value="visualization" className="space-y-6">
              <JourneyVisualization 
                customers={customers}
                touchpoints={touchpoints}
                journeyStages={journeyStages}
                timeRange={timeRange}
              />
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <JourneyStageManager 
                journeyStages={journeyStages}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}