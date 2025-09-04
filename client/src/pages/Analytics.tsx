import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Components
import AuthHeader from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart2, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Mail, 
  Megaphone, 
  PieChart,
  Download,
  RefreshCw,
  Clock,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Info
} from "lucide-react";

// Chart components
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell
} from "recharts";

// Shared types
import { Customer, Campaign } from "@shared/schema";

// Utility for formatting numbers
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

// Data visualization components
const CampaignPerformanceChart = ({ campaigns, period }: { campaigns: Campaign[], period: string }) => {
  const chartData = campaigns.map(campaign => ({
    name: campaign.name,
    conversions: campaign.conversions || 0,
    rate: campaign.percentage || 0
  }));
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <BarChart2 className="mr-2 h-5 w-5 text-primary-500" />
          Campaign Performance
        </CardTitle>
        <CardDescription>Conversion metrics for the {period} time period</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              tick={{ fontSize: 12 }}
              height={70}
            />
            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
            <Tooltip />
            <Legend wrapperStyle={{ bottom: 0 }} />
            <Bar yAxisId="left" dataKey="conversions" name="Conversions" fill="#8884d8" />
            <Bar yAxisId="right" dataKey="rate" name="Conversion Rate (%)" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const CustomerTrendChart = ({ data }: { data: any[] }) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <TrendingUp className="mr-2 h-5 w-5 text-primary-500" />
          Customer Growth Trend
        </CardTitle>
        <CardDescription>New and active customers over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="month" />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="newCustomers" 
              name="New Customers" 
              stroke="#8884d8" 
              fillOpacity={1} 
              fill="url(#colorNew)" 
            />
            <Area 
              type="monotone" 
              dataKey="activeCustomers" 
              name="Active Customers" 
              stroke="#82ca9d" 
              fillOpacity={1} 
              fill="url(#colorActive)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const ConversionFunnelChart = ({ data }: { data: any[] }) => {
  const COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c'];
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <PieChart className="mr-2 h-5 w-5 text-primary-500" />
          Conversion Funnel
        </CardTitle>
        <CardDescription>Conversion stages from leads to customers</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={220}>
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [formatNumber(value as number), name]} />
          </RechartsPieChart>
        </ResponsiveContainer>
        
        <div className="w-full grid grid-cols-1 gap-2 mt-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                />
                <span className="text-sm">{item.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{formatNumber(item.value)}</span>
                <span className="text-xs text-slate-500">
                  {index === 0 ? '' : `${((item.value / data[0].value) * 100).toFixed(1)}%`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const AIInsightCard = ({ 
  title, 
  insights, 
  recommendations 
}: { 
  title: string, 
  insights: any[], 
  recommendations: any[] 
}) => {
  // Helper function to safely get the text content regardless of format
  const getTextContent = (item: any): string => {
    if (typeof item === 'string') {
      return item;
    } else if (item && typeof item === 'object') {
      // Handle object format (for example, if item is {insight: "text"} or {recommendation: "text"})
      return item.insight || item.recommendation || JSON.stringify(item);
    }
    return "No data available";
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <TrendingUp className="mr-2 h-5 w-5 text-primary-500" />
          {title}
        </CardTitle>
        <CardDescription>AI-generated insights based on your data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center">
            <Info size={14} className="mr-1 text-blue-500" /> Key Insights
          </h4>
          <ul className="space-y-2">
            {Array.isArray(insights) ? insights.map((insight, index) => (
              <li key={index} className="text-sm flex items-start">
                <span className="text-blue-500 mr-2 mt-0.5">•</span>
                <span>{getTextContent(insight)}</span>
              </li>
            )) : (
              <li className="text-sm">No insights available</li>
            )}
          </ul>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center">
            <TrendingUp size={14} className="mr-1 text-emerald-500" /> Recommendations
          </h4>
          <ul className="space-y-2">
            {Array.isArray(recommendations) ? recommendations.map((recommendation, index) => (
              <li key={index} className="text-sm flex items-start">
                <span className="text-emerald-500 mr-2 mt-0.5">•</span>
                <span>{getTextContent(recommendation)}</span>
              </li>
            )) : (
              <li className="text-sm">No recommendations available</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Analytics component
const Analytics = () => {
  const [timePeriod, setTimePeriod] = useState("30d");
  const [activeTab, setActiveTab] = useState("performance");
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  
  const { toast } = useToast();
  
  // Mock data
  const mockCustomerGrowth = [
    { month: 'Jan', newCustomers: 65, activeCustomers: 400 },
    { month: 'Feb', newCustomers: 78, activeCustomers: 450 },
    { month: 'Mar', newCustomers: 90, activeCustomers: 520 },
    { month: 'Apr', newCustomers: 81, activeCustomers: 580 },
    { month: 'May', newCustomers: 105, activeCustomers: 650 },
    { month: 'Jun', newCustomers: 130, activeCustomers: 710 }
  ];
  
  const mockFunnelData = [
    { name: 'Leads', value: 4000 },
    { name: 'Qualified', value: 3000 },
    { name: 'Opportunities', value: 2000 },
    { name: 'Proposals', value: 1200 },
    { name: 'Customers', value: 800 }
  ];
  
  // Fetch data
  const { data: userData } = useQuery({
    queryKey: ['/api/user/current'],
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
  
  const { data: customerTrendData, isLoading: isLoadingCustomerTrend } = useQuery<{
    month: string;
    newCustomers: number;
    activeCustomers: number;
  }[]>({
    queryKey: ['/api/customers/trend'],
    staleTime: 300000 // 5 minutes
  });
  
  const { data: funnelData, isLoading: isLoadingFunnel } = useQuery<{
    name: string;
    value: number;
  }[]>({
    queryKey: ['/api/customers/funnel'],
    staleTime: 300000 // 5 minutes
  });
  
  const { data: campaigns, isLoading: isLoadingCampaigns } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns', timePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns?period=${timePeriod}`, {
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      
      return await res.json();
    }
  });
  
  const { data: aiInsights, isLoading: isLoadingInsights } = useQuery<{
    insights: string[];
    recommendations: string[];
  }>({
    queryKey: ['/api/ai/insights', timePeriod],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/ai/insights?period=${timePeriod}`, {
          credentials: 'include'
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch AI insights');
        }
        
        return await res.json();
      } catch (error) {
        console.error("Failed to get AI insights:", error);
        throw new Error("Failed to get AI insights");
      }
    },
    enabled: activeTab === "insights" // Only fetch when insights tab is active
  });
  
  // Refresh AI insights from API
  const generateNewInsights = async () => {
    setIsGeneratingInsights(true);
    
    try {
      // First check that we're properly connected to OpenAI
      const openaiStatus = await fetch('/api/config/openai/status', {
        credentials: 'include'
      }).then(res => res.json());
      
      if (!openaiStatus || !openaiStatus.configured) {
        toast({
          title: "OpenAI Not Configured",
          description: "Please configure your OpenAI API key in the AI Dashboard first.",
          variant: "destructive"
        });
        return;
      }
      
      // Use the queryClient to invalidate the insights query and refetch
      queryClient.invalidateQueries({ queryKey: ['/api/ai/insights'] });
      
      // Show a success toast
      toast({
        title: "Insights updated",
        description: "New AI-generated insights are now available"
      });
    } catch (error) {
      console.error("Failed to refresh insights:", error);
      
      toast({
        title: "Error",
        description: "Failed to refresh insights. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingInsights(false);
    }
  };
  
  // Handle export
  const handleExport = (format: string) => {
    toast({
      title: `Exporting ${activeTab}`,
      description: `Your ${activeTab} data is being exported as ${format.toUpperCase()}`,
    });
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
        user={userData || { id: 1, name: "John Doe", initials: "JD" }} 
        notifications={notifications || []} 
        onLogout={handleLogout} 
      />
      
      
        
        
        
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-3 sm:space-y-0">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
                <p className="text-slate-500 mt-1">Track performance and gain insights</p>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <Select value={timePeriod} onValueChange={setTimePeriod}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-2" />
                      <span>Time Period</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="1y">This Year</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select onValueChange={handleExport} defaultValue="">
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <div className="flex items-center">
                      <Download size={14} className="mr-2" />
                      <span>Export</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">Export as PDF</SelectItem>
                    <SelectItem value="csv">Export as CSV</SelectItem>
                    <SelectItem value="excel">Export as Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Analytics Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
                <TabsTrigger value="performance" className="flex items-center">
                  <BarChart2 size={14} className="mr-2 hidden sm:inline-block" />
                  <span>Performance</span>
                </TabsTrigger>
                <TabsTrigger value="customers" className="flex items-center">
                  <Users size={14} className="mr-2 hidden sm:inline-block" />
                  <span>Customers</span>
                </TabsTrigger>
                <TabsTrigger value="insights" className="flex items-center">
                  <TrendingUp size={14} className="mr-2 hidden sm:inline-block" />
                  <span>AI Insights</span>
                </TabsTrigger>
              </TabsList>
            
              {/* Performance Analytics */}
              <TabsContent value="performance" className="mt-0 space-y-6">
                {/* Campaign Performance */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="md:col-span-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Campaign Performance Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingCampaigns ? (
                      <div className="h-[300px] bg-slate-100 animate-pulse rounded-md" />
                    ) : (
                      <CampaignPerformanceChart 
                        campaigns={campaigns || []} 
                        period={timePeriod === "7d" ? "weekly" : timePeriod === "30d" ? "monthly" : timePeriod === "90d" ? "quarterly" : "yearly"}
                      />
                    )}
                  </CardContent>
                </Card>
                
                {/* Performance Metrics */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Conversion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-bold">24.8%</div>
                      <div className="flex items-center text-emerald-500 text-sm">
                        <ChevronUp size={14} className="mr-1" />
                        <span>+2.4%</span>
                      </div>
                    </div>
                    <Progress value={24.8} className="h-2 mt-2" />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Avg. Engagement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-bold">68%</div>
                      <div className="flex items-center text-emerald-500 text-sm">
                        <ChevronUp size={14} className="mr-1" />
                        <span>+5.1%</span>
                      </div>
                    </div>
                    <Progress value={68} className="h-2 mt-2" />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Cost per Lead</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-bold">$12.40</div>
                      <div className="flex items-center text-emerald-500 text-sm">
                        <ChevronDown size={14} className="mr-1" />
                        <span>-8.2%</span>
                      </div>
                    </div>
                    <Progress value={35} className="h-2 mt-2" />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">ROI</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-bold">315%</div>
                      <div className="flex items-center text-emerald-500 text-sm">
                        <ChevronUp size={14} className="mr-1" />
                        <span>+12.5%</span>
                      </div>
                    </div>
                    <Progress value={75} className="h-2 mt-2" />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Customer Analytics */}
            <TabsContent value="customers" className="mt-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Customer Growth Trend */}
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Customer Growth Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingCustomerTrend ? (
                      <div className="h-[300px] bg-slate-100 animate-pulse rounded-md" />
                    ) : (
                      <CustomerTrendChart data={customerTrendData || mockCustomerGrowth} />
                    )}
                  </CardContent>
                </Card>
                
                {/* Conversion Funnel */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Conversion Funnel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingFunnel ? (
                      <div className="h-[300px] bg-slate-100 animate-pulse rounded-md" />
                    ) : (
                      <ConversionFunnelChart data={funnelData || mockFunnelData} />
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Customer Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Total Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-bold">1,284</div>
                      <div className="flex items-center text-emerald-500 text-sm">
                        <ChevronUp size={14} className="mr-1" />
                        <span>+12.3%</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">vs. previous period</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">New Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-bold">105</div>
                      <div className="flex items-center text-emerald-500 text-sm">
                        <ChevronUp size={14} className="mr-1" />
                        <span>+8.7%</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">vs. previous period</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Churn Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-bold">2.4%</div>
                      <div className="flex items-center text-emerald-500 text-sm">
                        <ChevronDown size={14} className="mr-1" />
                        <span>-0.8%</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">vs. previous period</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">CLTV</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-bold">$542</div>
                      <div className="flex items-center text-emerald-500 text-sm">
                        <ChevronUp size={14} className="mr-1" />
                        <span>+4.2%</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">vs. previous period</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* AI Insights */}
            <TabsContent value="insights" className="mt-0 space-y-6">
              <div className="flex justify-end mb-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center space-x-2"
                  onClick={generateNewInsights}
                  disabled={isGeneratingInsights}
                >
                  <RefreshCw size={14} className={isGeneratingInsights ? "animate-spin" : ""} />
                  <span>{isGeneratingInsights ? "Generating..." : "Refresh Insights"}</span>
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isLoadingInsights ? (
                  <>
                    <Card className="h-[400px] animate-pulse">
                      <CardHeader className="bg-slate-100 h-[70px]" />
                      <CardContent className="space-y-3 p-4">
                        <div className="h-4 bg-slate-100 rounded" />
                        <div className="h-4 bg-slate-100 rounded" />
                        <div className="h-4 bg-slate-100 rounded w-3/4" />
                        <div className="h-4 bg-slate-100 rounded" />
                      </CardContent>
                    </Card>
                    <Card className="h-[400px] animate-pulse">
                      <CardHeader className="bg-slate-100 h-[70px]" />
                      <CardContent className="space-y-3 p-4">
                        <div className="h-4 bg-slate-100 rounded" />
                        <div className="h-4 bg-slate-100 rounded" />
                        <div className="h-4 bg-slate-100 rounded w-3/4" />
                        <div className="h-4 bg-slate-100 rounded" />
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <>
                    <AIInsightCard 
                      title="Customer Behavior Insights"
                      insights={aiInsights?.insights.slice(0, 3) || []}
                      recommendations={aiInsights?.recommendations.slice(0, 3) || []}
                    />
                    <AIInsightCard 
                      title="Campaign Performance Insights"
                      insights={aiInsights?.insights.slice(3) || []} 
                      recommendations={aiInsights?.recommendations.slice(3) || []}
                    />
                  </>
                )}
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Mail className="mr-2 h-5 w-5 text-primary-500" />
                    AI-Generated Campaign Recommendations
                  </CardTitle>
                  <CardDescription>
                    Tailored campaign suggestions based on your customer data and past performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border border-slate-200 hover:border-primary-300 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <Megaphone className="h-8 w-8 text-primary-500 mb-3" />
                        <h3 className="text-sm font-semibold mb-2">Re-engagement Campaign</h3>
                        <p className="text-sm text-slate-600 mb-4">
                          Target inactive customers with a special offer to bring them back.
                        </p>
                        <div className="flex justify-between items-center">
                          <Badge>High Priority</Badge>
                          <Button variant="ghost" size="sm">
                            <ExternalLink size={14} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border border-slate-200 hover:border-primary-300 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <Megaphone className="h-8 w-8 text-primary-500 mb-3" />
                        <h3 className="text-sm font-semibold mb-2">VIP Customer Rewards</h3>
                        <p className="text-sm text-slate-600 mb-4">
                          Exclusive promotion for your top 10% of customers by value.
                        </p>
                        <div className="flex justify-between items-center">
                          <Badge variant="outline">Medium Priority</Badge>
                          <Button variant="ghost" size="sm">
                            <ExternalLink size={14} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border border-slate-200 hover:border-primary-300 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <Megaphone className="h-8 w-8 text-primary-500 mb-3" />
                        <h3 className="text-sm font-semibold mb-2">New Product Announcement</h3>
                        <p className="text-sm text-slate-600 mb-4">
                          Targeted campaign for customers interested in this category.
                        </p>
                        <div className="flex justify-between items-center">
                          <Badge variant="outline">Medium Priority</Badge>
                          <Button variant="ghost" size="sm">
                            <ExternalLink size={14} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          </div>
        </main>
    </div>
  );
};

export default Analytics;