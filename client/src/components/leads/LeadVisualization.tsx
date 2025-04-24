import React, { useState } from 'react';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line 
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A67DF8', '#F87D7D'];

export function LeadVisualization({ leads }: { leads: any[] }) {
  const [timeRange, setTimeRange] = useState('30days');
  const [chartView, setChartView] = useState('sources');
  
  if (!leads?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Analytics</CardTitle>
          <CardDescription>No lead data available for visualization</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Add leads to see analytics</p>
        </CardContent>
      </Card>
    );
  }

  // Process data for visualizations
  const leadsBySource = processLeadsBySource(leads);
  const leadsByStatus = processLeadsByStatus(leads);
  const leadScoreDistribution = processLeadScoreDistribution(leads);
  const leadTrend = processLeadTrend(leads);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Lead Analytics</CardTitle>
            <CardDescription>Interactive visualizations of your lead data</CardDescription>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="alltime">All Time</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sources" onValueChange={setChartView}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sources">Lead Sources</TabsTrigger>
            <TabsTrigger value="status">Lead Status</TabsTrigger>
            <TabsTrigger value="scores">Lead Scores</TabsTrigger>
            <TabsTrigger value="trend">Lead Trend</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sources" className="mt-4">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={leadsBySource}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {leadsBySource.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [`${value} leads`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-center text-muted-foreground text-sm mt-4">
              Distribution of leads by their acquisition source
            </p>
          </TabsContent>
          
          <TabsContent value="status" className="mt-4">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={leadsByStatus}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Number of Leads" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-center text-muted-foreground text-sm mt-4">
              Distribution of leads by their current status
            </p>
          </TabsContent>
          
          <TabsContent value="scores" className="mt-4">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={leadScoreDistribution}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Number of Leads" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-center text-muted-foreground text-sm mt-4">
              Distribution of leads by score ranges
            </p>
          </TabsContent>
          
          <TabsContent value="trend" className="mt-4">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart
                data={leadTrend}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  name="New Leads" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-center text-muted-foreground text-sm mt-4">
              Lead acquisition trend over time
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between text-sm text-muted-foreground">
        <div>Total Leads: {leads.length}</div>
        <div>Last Updated: {new Date().toLocaleDateString()}</div>
      </CardFooter>
    </Card>
  );
}

// Data processing functions
function processLeadsBySource(leads: any[]) {
  const sourceMap: Record<string, number> = {};
  
  leads.forEach(lead => {
    const source = lead.leadSource || 'Unknown';
    sourceMap[source] = (sourceMap[source] || 0) + 1;
  });
  
  return Object.entries(sourceMap).map(([name, value]) => ({ name, value }));
}

function processLeadsByStatus(leads: any[]) {
  const statusMap: Record<string, number> = {};
  
  leads.forEach(lead => {
    const status = lead.leadStatus || 'Unknown';
    statusMap[status] = (statusMap[status] || 0) + 1;
  });
  
  return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
}

function processLeadScoreDistribution(leads: any[]) {
  // Create score ranges
  const ranges = [
    { min: 0, max: 20, label: '0-20' },
    { min: 21, max: 40, label: '21-40' },
    { min: 41, max: 60, label: '41-60' },
    { min: 61, max: 80, label: '61-80' },
    { min: 81, max: 100, label: '81-100' }
  ];
  
  const distribution = ranges.map(range => ({
    range: range.label,
    count: 0
  }));
  
  leads.forEach(lead => {
    const score = lead.score || 0;
    for (let i = 0; i < ranges.length; i++) {
      if (score >= ranges[i].min && score <= ranges[i].max) {
        distribution[i].count++;
        break;
      }
    }
  });
  
  return distribution;
}

function processLeadTrend(leads: any[]) {
  // Get leads from the last 6 months
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  
  const monthData: Record<string, number> = {};
  
  // Initialize all months
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(now.getMonth() - i);
    const monthKey = d.toLocaleString('default', { month: 'short' });
    monthData[monthKey] = 0;
  }
  
  // Count leads by month
  leads.forEach(lead => {
    const createdAt = new Date(lead.createdAt);
    if (createdAt >= sixMonthsAgo) {
      const monthKey = createdAt.toLocaleString('default', { month: 'short' });
      if (monthData[monthKey] !== undefined) {
        monthData[monthKey]++;
      }
    }
  });
  
  // Convert to array format for chart
  return Object.keys(monthData)
    .map(month => ({ date: month, count: monthData[month] }))
    .reverse(); // Show oldest month first
}