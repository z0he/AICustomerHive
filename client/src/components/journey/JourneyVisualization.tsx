import { useMemo, useState } from "react";
import { format, subDays, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  Legend,
  ReferenceLine,
  Sankey,
  FunnelChart,
  Funnel,
  LabelList,
  Cell
} from "recharts";

// Icons
import {
  TrendingUp,
  Clock,
  Activity,
  Eye,
  Users,
  ArrowRight,
  Filter,
  Calendar,
  BarChart3
} from "lucide-react";

// Types
import { Customer, CustomerTouchpoint, JourneyStage } from "@shared/schema";

interface JourneyVisualizationProps {
  customers: Customer[];
  touchpoints: CustomerTouchpoint[];
  journeyStages: JourneyStage[];
  timeRange: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

export default function JourneyVisualization({
  customers,
  touchpoints,
  journeyStages,
  timeRange
}: JourneyVisualizationProps) {
  const [visualizationType, setVisualizationType] = useState("timeline");
  const [selectedStage, setSelectedStage] = useState("all");

  // Filter touchpoints by time range
  const filteredTouchpoints = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "7d":
        startDate = subDays(now, 7);
        break;
      case "30d":
        startDate = subDays(now, 30);
        break;
      case "90d":
        startDate = subDays(now, 90);
        break;
      case "1y":
        startDate = subDays(now, 365);
        break;
      default:
        startDate = subDays(now, 30);
    }

    return touchpoints.filter(tp => {
      const touchpointDate = new Date(tp.createdAt);
      return touchpointDate >= startDate && touchpointDate <= now;
    });
  }, [touchpoints, timeRange]);

  // Timeline visualization data
  const timelineData = useMemo(() => {
    if (!filteredTouchpoints.length) return [];

    // Group touchpoints by date
    const touchpointsByDate = filteredTouchpoints.reduce((acc, tp) => {
      const date = format(new Date(tp.createdAt), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = {};
      }
      if (!acc[date][tp.touchpointStage]) {
        acc[date][tp.touchpointStage] = 0;
      }
      acc[date][tp.touchpointStage]++;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Convert to chart data
    return Object.entries(touchpointsByDate)
      .map(([date, stages]) => ({
        date,
        displayDate: format(new Date(date), 'MMM d'),
        ...stages,
        total: Object.values(stages).reduce((sum, count) => sum + count, 0)
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredTouchpoints]);

  // Customer journey flow data
  const journeyFlowData = useMemo(() => {
    const stageTransitions: Record<string, Record<string, number>> = {};
    
    customers.forEach(customer => {
      const customerTouchpoints = filteredTouchpoints
        .filter(tp => tp.customerId === customer.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      for (let i = 0; i < customerTouchpoints.length - 1; i++) {
        const currentStage = customerTouchpoints[i].touchpointStage;
        const nextStage = customerTouchpoints[i + 1].touchpointStage;
        
        if (currentStage !== nextStage) {
          if (!stageTransitions[currentStage]) {
            stageTransitions[currentStage] = {};
          }
          stageTransitions[currentStage][nextStage] = (stageTransitions[currentStage][nextStage] || 0) + 1;
        }
      }
    });

    return stageTransitions;
  }, [customers, filteredTouchpoints]);

  // Engagement score over time
  const engagementTimelineData = useMemo(() => {
    const engagementByDate = filteredTouchpoints.reduce((acc, tp) => {
      const date = format(new Date(tp.createdAt), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = { total: 0, count: 0 };
      }
      acc[date].total += tp.score || 0;
      acc[date].count++;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return Object.entries(engagementByDate)
      .map(([date, data]) => ({
        date,
        displayDate: format(new Date(date), 'MMM d'),
        avgScore: Math.round(data.total / data.count),
        touchpoints: data.count
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredTouchpoints]);

  // Customer journey completion funnel
  const journeyFunnelData = useMemo(() => {
    const stageOrder = ['awareness', 'consideration', 'decision', 'retention', 'advocacy'];
    const stageCustomers: Record<string, Set<number>> = {};

    filteredTouchpoints.forEach(tp => {
      if (!stageCustomers[tp.touchpointStage]) {
        stageCustomers[tp.touchpointStage] = new Set();
      }
      stageCustomers[tp.touchpointStage].add(tp.customerId);
    });

    return stageOrder.map(stage => ({
      name: stage.charAt(0).toUpperCase() + stage.slice(1),
      value: stageCustomers[stage]?.size || 0,
      fill: COLORS[stageOrder.indexOf(stage) % COLORS.length]
    }));
  }, [filteredTouchpoints]);

  // Journey duration analysis
  const journeyDurationData = useMemo(() => {
    return customers.map(customer => {
      const customerTouchpoints = filteredTouchpoints
        .filter(tp => tp.customerId === customer.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      if (customerTouchpoints.length < 2) return null;

      const firstTouchpoint = customerTouchpoints[0];
      const lastTouchpoint = customerTouchpoints[customerTouchpoints.length - 1];
      const duration = Math.round((new Date(lastTouchpoint.createdAt).getTime() - new Date(firstTouchpoint.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      
      const avgScore = customerTouchpoints.reduce((sum, tp) => sum + (tp.score || 0), 0) / customerTouchpoints.length;

      return {
        customerId: customer.id,
        customerName: customer.name,
        duration,
        touchpointCount: customerTouchpoints.length,
        avgScore: Math.round(avgScore),
        currentStage: lastTouchpoint.touchpointStage
      };
    }).filter(Boolean) as Array<{
      customerId: number;
      customerName: string;
      duration: number;
      touchpointCount: number;
      avgScore: number;
      currentStage: string;
    }>;
  }, [customers, filteredTouchpoints]);

  // Get unique stages for filtering
  const availableStages = useMemo(() => {
    const stagesSet = new Set(filteredTouchpoints.map(tp => tp.touchpointStage));
    return Array.from(stagesSet).sort();
  }, [filteredTouchpoints]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Journey Visualization</CardTitle>
              <CardDescription>Interactive customer journey analytics and patterns</CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              <Select value={visualizationType} onValueChange={setVisualizationType}>
                <SelectTrigger className="w-[150px]">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timeline">Timeline</SelectItem>
                  <SelectItem value="engagement">Engagement</SelectItem>
                  <SelectItem value="funnel">Journey Funnel</SelectItem>
                  <SelectItem value="duration">Duration Analysis</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger className="w-[120px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {availableStages.map(stage => (
                    <SelectItem key={stage} value={stage}>
                      {stage.charAt(0).toUpperCase() + stage.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Visualization Content */}
      {visualizationType === "timeline" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Touchpoint Timeline
            </CardTitle>
            <CardDescription>Daily touchpoint activity across journey stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="displayDate" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [value, name.charAt(0).toUpperCase() + name.slice(1)]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                {availableStages.map((stage, index) => (
                  <Area
                    key={stage}
                    type="monotone"
                    dataKey={stage}
                    stackId="1"
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {visualizationType === "engagement" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Engagement Over Time
            </CardTitle>
            <CardDescription>Average engagement scores and touchpoint volume</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={engagementTimelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="displayDate" />
                <YAxis yAxisId="left" domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'avgScore') return [`${value}/100`, 'Avg Score'];
                    return [value, 'Touchpoints'];
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="avgScore" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="touchpoints" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {visualizationType === "funnel" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Customer Journey Funnel
            </CardTitle>
            <CardDescription>Customer progression through journey stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <FunnelChart>
                <Tooltip 
                  formatter={(value: number) => [`${value} customers`, 'Count']}
                />
                <Funnel
                  dataKey="value"
                  data={journeyFunnelData}
                  isAnimationActive
                >
                  <LabelList 
                    position="right"
                    fill="#374151"
                    stroke="none"
                    dataKey="name"
                    fontSize={14}
                  />
                  <LabelList
                    position="center"
                    fill="#ffffff"
                    stroke="none"
                    dataKey="value"
                    fontSize={12}
                    fontWeight="bold"
                  />
                  {journeyFunnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {visualizationType === "duration" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Journey Duration Analysis
            </CardTitle>
            <CardDescription>Customer journey length vs engagement correlation</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart data={journeyDurationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="duration" 
                  name="Duration"
                  unit=" days"
                />
                <YAxis 
                  dataKey="avgScore" 
                  name="Avg Score"
                  domain={[0, 100]}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'avgScore') return [`${value}/100`, 'Avg Score'];
                    if (name === 'duration') return [`${value} days`, 'Duration'];
                    return [value, name];
                  }}
                  labelFormatter={() => ''}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg">
                          <p className="font-semibold">{data.customerName}</p>
                          <p>Duration: {data.duration} days</p>
                          <p>Avg Score: {data.avgScore}/100</p>
                          <p>Touchpoints: {data.touchpointCount}</p>
                          <p>Current Stage: {data.currentStage}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter 
                  dataKey="avgScore" 
                  fill="#6366f1"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Journey Stage Transitions */}
      <Card>
        <CardHeader>
          <CardTitle>Stage Transition Patterns</CardTitle>
          <CardDescription>How customers move between journey stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(journeyFlowData).map(([fromStage, transitions]) => (
              <div key={fromStage} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold capitalize text-lg">{fromStage}</h4>
                  <Badge variant="outline">
                    {Object.values(transitions).reduce((sum, count) => sum + count, 0)} transitions
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(transitions).map(([toStage, count]) => (
                    <div key={toStage} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div className="flex items-center space-x-2">
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="capitalize">{toStage}</span>
                      </div>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(journeyFlowData).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No stage transitions found in the selected time range.</p>
                <p className="text-sm">Customers need multiple touchpoints across different stages to show transition patterns.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}