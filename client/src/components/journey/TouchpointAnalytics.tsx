import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend
} from "recharts";

// Icons
import {
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Clock,
  Star,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from "lucide-react";

// Types
import { CustomerTouchpoint, Customer } from "@shared/schema";

interface TouchpointAnalyticsProps {
  touchpoints: CustomerTouchpoint[];
  customers: Customer[];
  timeRange: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#6b7280'];

export default function TouchpointAnalytics({
  touchpoints,
  customers,
  timeRange
}: TouchpointAnalyticsProps) {
  
  // Calculate analytics data
  const analyticsData = useMemo(() => {
    // Touchpoints by type
    const touchpointsByType = touchpoints.reduce((acc, tp) => {
      acc[tp.touchpointType] = (acc[tp.touchpointType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Touchpoints by stage
    const touchpointsByStage = touchpoints.reduce((acc, tp) => {
      acc[tp.touchpointStage] = (acc[tp.touchpointStage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Touchpoints by channel
    const touchpointsByChannel = touchpoints.reduce((acc, tp) => {
      acc[tp.channel] = (acc[tp.channel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Average engagement score by stage
    const engagementByStage = touchpoints.reduce((acc, tp) => {
      if (!acc[tp.touchpointStage]) {
        acc[tp.touchpointStage] = { total: 0, count: 0 };
      }
      acc[tp.touchpointStage].total += tp.score || 0;
      acc[tp.touchpointStage].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    // Customer journey progression
    const journeyProgression = customers.map(customer => {
      const customerTouchpoints = touchpoints
        .filter(tp => tp.customerId === customer.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      const stagesSet = new Set(customerTouchpoints.map(tp => tp.touchpointStage));
      const stages = Array.from(stagesSet);
      const avgScore = customerTouchpoints.length > 0 
        ? customerTouchpoints.reduce((sum, tp) => sum + (tp.score || 0), 0) / customerTouchpoints.length 
        : 0;

      return {
        customerId: customer.id,
        customerName: customer.name,
        touchpointCount: customerTouchpoints.length,
        stageCount: stages.length,
        avgScore: Math.round(avgScore),
        currentStage: customerTouchpoints[customerTouchpoints.length - 1]?.touchpointStage || 'awareness'
      };
    });

    // Conversion funnel data
    const stageOrder = ['awareness', 'consideration', 'decision', 'retention', 'advocacy'];
    const funnelData = stageOrder.map(stage => ({
      stage: stage.charAt(0).toUpperCase() + stage.slice(1),
      customers: journeyProgression.filter(jp => jp.currentStage === stage).length,
      touchpoints: touchpointsByStage[stage] || 0
    }));

    return {
      touchpointsByType: Object.entries(touchpointsByType).map(([type, count]) => ({
        type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count,
        percentage: Math.round((count / touchpoints.length) * 100)
      })).sort((a, b) => b.count - a.count),

      touchpointsByChannel: Object.entries(touchpointsByChannel).map(([channel, count]) => ({
        channel: channel.charAt(0).toUpperCase() + channel.slice(1),
        count,
        percentage: Math.round((count / touchpoints.length) * 100)
      })).sort((a, b) => b.count - a.count),

      engagementByStage: Object.entries(engagementByStage).map(([stage, data]) => ({
        stage: stage.charAt(0).toUpperCase() + stage.slice(1),
        avgScore: Math.round(data.total / data.count),
        touchpoints: data.count
      })).sort((a, b) => {
        const stageOrder = ['Awareness', 'Consideration', 'Decision', 'Retention', 'Advocacy'];
        return stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage);
      }),

      journeyProgression,
      funnelData,

      totalTouchpoints: touchpoints.length,
      avgTouchpointsPerCustomer: customers.length > 0 ? Math.round(touchpoints.length / customers.length * 10) / 10 : 0,
      mostActiveStage: Object.entries(touchpointsByStage).sort(([,a], [,b]) => b - a)[0]?.[0] || 'awareness',
      mostActiveChannel: Object.entries(touchpointsByChannel).sort(([,a], [,b]) => b - a)[0]?.[0] || 'website'
    };
  }, [touchpoints, customers]);

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Touchpoints</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalTouchpoints}</div>
            <p className="text-xs text-muted-foreground">
              Across all customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Per Customer</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.avgTouchpointsPerCustomer}</div>
            <p className="text-xs text-muted-foreground">
              Touchpoints per customer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Active Stage</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{analyticsData.mostActiveStage}</div>
            <p className="text-xs text-muted-foreground">
              Highest engagement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Channel</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{analyticsData.mostActiveChannel}</div>
            <p className="text-xs text-muted-foreground">
              Most touchpoints
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Touchpoints by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Touchpoints by Type
            </CardTitle>
            <CardDescription>Distribution of touchpoint types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.touchpointsByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="type" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [value, 'Count']}
                  labelFormatter={(label) => `Type: ${label}`}
                />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Touchpoints by Channel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="mr-2 h-5 w-5" />
              Touchpoints by Channel
            </CardTitle>
            <CardDescription>Distribution across channels</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.touchpointsByChannel}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ channel, percentage }) => `${channel} (${percentage}%)`}
                >
                  {analyticsData.touchpointsByChannel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'Touchpoints']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Engagement by Stage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LineChartIcon className="mr-2 h-5 w-5" />
              Engagement by Stage
            </CardTitle>
            <CardDescription>Average engagement score per journey stage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.engagementByStage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: number) => [`${value}/100`, 'Avg Score']}
                  labelFormatter={(label) => `Stage: ${label}`}
                />
                <Area type="monotone" dataKey="avgScore" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Customer Journey Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingDown className="mr-2 h-5 w-5" />
              Journey Funnel
            </CardTitle>
            <CardDescription>Customer progression through stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.funnelData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={100} />
                <Tooltip 
                  formatter={(value: number) => [value, 'Customers']}
                  labelFormatter={(label) => `Stage: ${label}`}
                />
                <Bar dataKey="customers" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Engaged Customers</CardTitle>
          <CardDescription>Customers with highest journey engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.journeyProgression
              .sort((a, b) => b.avgScore - a.avgScore)
              .slice(0, 10)
              .map((customer, index) => (
                <div key={customer.customerId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{customer.customerName}</div>
                      <div className="text-sm text-gray-500">
                        {customer.touchpointCount} touchpoints • {customer.stageCount} stages
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge className="capitalize">
                      {customer.currentStage}
                    </Badge>
                    <div className="text-right">
                      <div className="font-bold text-lg">{customer.avgScore}/100</div>
                      <div className="text-xs text-gray-500">Engagement</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}