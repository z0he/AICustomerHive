import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function MarketingFormStats() {
  const [timeRange, setTimeRange] = useState('30d');

  // Fetch form analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['/api/marketing/forms/analytics', timeRange],
    staleTime: 300000, // 5 minutes
  });

  // Colors for charts
  const colors = {
    views: '#8884d8',
    submissions: '#82ca9d',
    conversionRate: '#ffc658',
  };

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Mock data for initial rendering - will be replaced with real data from API
  const mockTimeData = [
    { date: 'Apr 1', views: 120, submissions: 18, conversionRate: 15 },
    { date: 'Apr 8', views: 140, submissions: 24, conversionRate: 17.1 },
    { date: 'Apr 15', views: 135, submissions: 27, conversionRate: 20 },
    { date: 'Apr 22', views: 180, submissions: 36, conversionRate: 20 },
    { date: 'Apr 29', views: 210, submissions: 48, conversionRate: 22.9 },
    { date: 'May 1', views: 160, submissions: 35, conversionRate: 21.9 },
  ];

  const mockDeviceData = [
    { name: 'Desktop', value: 55 },
    { name: 'Mobile', value: 40 },
    { name: 'Tablet', value: 5 },
  ];

  const mockSourceData = [
    { name: 'Direct Traffic', value: 30 },
    { name: 'Organic Search', value: 25 },
    { name: 'Social Media', value: 20 },
    { name: 'Email Campaigns', value: 15 },
    { name: 'Referrals', value: 10 },
  ];

  // Use data from API or mock data
  const timeData = analyticsData?.timeData || mockTimeData;
  const deviceData = analyticsData?.deviceData || mockDeviceData;
  const sourceData = analyticsData?.sourceData || mockSourceData;

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={timeData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="views"
          stroke={colors.views}
          name="Views"
          activeDot={{ r: 8 }}
        />
        <Line
          type="monotone"
          dataKey="submissions"
          stroke={colors.submissions}
          name="Submissions"
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={timeData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar
          dataKey="conversionRate"
          fill={colors.conversionRate}
          name="Conversion Rate (%)"
        />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderDevicePieChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={deviceData}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {deviceData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value}%`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderSourcePieChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={sourceData}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {sourceData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value}%`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Tabs defaultValue="30d" value={timeRange} onValueChange={setTimeRange}>
          <TabsList>
            <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
            <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
            <TabsTrigger value="90d">Last 90 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">Form Views & Submissions</h3>
            {renderLineChart()}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">Conversion Rate</h3>
            {renderBarChart()}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">Device Breakdown</h3>
            {renderDevicePieChart()}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">Traffic Sources</h3>
            {renderSourcePieChart()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}