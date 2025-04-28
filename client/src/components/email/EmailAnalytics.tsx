import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2, RefreshCw, BarChart4, LineChart, PieChart, Calendar } from "lucide-react";
import {
  LineChart as ReLineChart,
  Line,
  BarChart as ReBarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const EmailAnalytics = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('last30');
  const [chartView, setChartView] = useState('weekly');

  // Fetch email analytics data
  const {
    data: analyticsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['/api/email/analytics', timeRange],
  });

  // Helper functions
  const formatTimePeriod = (period: string) => {
    switch (period) {
      case 'last7':
        return 'Last 7 Days';
      case 'last30':
        return 'Last 30 Days';
      case 'last90':
        return 'Last 90 Days';
      case 'thisYear':
        return 'This Year';
      default:
        return 'Last 30 Days';
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // Placeholder data if API isn't implemented yet
  const overview = analyticsData?.overview || {
    totalSent: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
    unsubscribeRate: 0,
  };

  const campaigns = analyticsData?.campaigns || [];
  const trendsData = analyticsData?.trends || [];
  const deviceData = analyticsData?.devices || [];
  const timeData = analyticsData?.timeDistribution || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Email Performance Analytics</h2>
        <div className="flex space-x-2">
          <Select
            value={timeRange}
            onValueChange={setTimeRange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7">Last 7 Days</SelectItem>
              <SelectItem value="last30">Last 30 Days</SelectItem>
              <SelectItem value="last90">Last 90 Days</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading analytics data...</span>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load email analytics. Please try again.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">
                <BarChart4 className="mr-2 h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="campaigns">
                <LineChart className="mr-2 h-4 w-4" />
                Campaign Performance
              </TabsTrigger>
              <TabsTrigger value="trends">
                <LineChart className="mr-2 h-4 w-4" />
                Trends
              </TabsTrigger>
              <TabsTrigger value="insights">
                <PieChart className="mr-2 h-4 w-4" />
                Insights
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Email Performance Overview</CardTitle>
                  <CardDescription>
                    Key metrics for {formatTimePeriod(timeRange)}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Total Emails Sent */}
                    <Card>
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Total Sent
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">{overview.totalSent}</div>
                      </CardContent>
                    </Card>

                    {/* Open Rate */}
                    <Card>
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Open Rate
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">{formatPercentage(overview.openRate)}</div>
                      </CardContent>
                    </Card>

                    {/* Click Rate */}
                    <Card>
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Click Rate
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">{formatPercentage(overview.clickRate)}</div>
                      </CardContent>
                    </Card>

                    {/* Bounce Rate */}
                    <Card>
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Bounce Rate
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">{formatPercentage(overview.bounceRate)}</div>
                      </CardContent>
                    </Card>

                    {/* Unsubscribe Rate */}
                    <Card>
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Unsubscribe Rate
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">{formatPercentage(overview.unsubscribeRate)}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Email Performance Trends</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReLineChart
                          data={trendsData}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis>
                            <Label
                              value="Rate (%)"
                              angle={-90}
                              position="insideLeft"
                              style={{ textAnchor: 'middle' }}
                            />
                          </YAxis>
                          <Tooltip formatter={(value) => [`${(Number(value) * 100).toFixed(2)}%`, '']} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="openRate"
                            name="Open Rate"
                            stroke="#0088FE"
                            activeDot={{ r: 8 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="clickRate"
                            name="Click Rate"
                            stroke="#00C49F"
                          />
                          <Line
                            type="monotone"
                            dataKey="bounceRate"
                            name="Bounce Rate"
                            stroke="#FF8042"
                          />
                        </ReLineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Campaign Performance Tab */}
            <TabsContent value="campaigns" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Performance</CardTitle>
                  <CardDescription>
                    Compare the performance of different email campaigns.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart
                        data={campaigns}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(tick) => `${(tick * 100).toFixed(0)}%`} />
                        <Tooltip formatter={(value) => [`${(Number(value) * 100).toFixed(2)}%`, '']} />
                        <Legend />
                        <Bar dataKey="openRate" name="Open Rate" fill="#0088FE" />
                        <Bar dataKey="clickRate" name="Click Rate" fill="#00C49F" />
                        <Bar dataKey="conversionRate" name="Conversion Rate" fill="#8884d8" />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Top Performing Campaigns</h3>
                      <div className="space-y-4">
                        {campaigns
                          .sort((a, b) => b.clickRate - a.clickRate)
                          .slice(0, 3)
                          .map((campaign, index) => (
                            <Card key={index}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-medium">{campaign.name}</h4>
                                    <p className="text-sm text-muted-foreground">{campaign.date}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium">Click Rate</p>
                                    <p className="text-lg font-bold text-green-600">
                                      {formatPercentage(campaign.clickRate)}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Campaigns with Highest Conversion</h3>
                      <div className="space-y-4">
                        {campaigns
                          .sort((a, b) => b.conversionRate - a.conversionRate)
                          .slice(0, 3)
                          .map((campaign, index) => (
                            <Card key={index}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-medium">{campaign.name}</h4>
                                    <p className="text-sm text-muted-foreground">{campaign.date}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium">Conversion Rate</p>
                                    <p className="text-lg font-bold text-purple-600">
                                      {formatPercentage(campaign.conversionRate)}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Email Performance Trends</CardTitle>
                      <CardDescription>
                        Track how email performance metrics change over time.
                      </CardDescription>
                    </div>
                    <div>
                      <Select
                        value={chartView}
                        onValueChange={setChartView}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="View by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReLineChart
                        data={trendsData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 25,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date"
                          angle={-45}
                          textAnchor="end"
                          height={70}
                        />
                        <YAxis tickFormatter={(tick) => `${(tick * 100).toFixed(0)}%`} />
                        <Tooltip formatter={(value) => [`${(Number(value) * 100).toFixed(2)}%`, '']} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="openRate"
                          name="Open Rate"
                          stroke="#0088FE"
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="clickRate"
                          name="Click Rate"
                          stroke="#00C49F"
                        />
                        <Line
                          type="monotone"
                          dataKey="bounceRate"
                          name="Bounce Rate"
                          stroke="#FF8042"
                        />
                        <Line
                          type="monotone"
                          dataKey="unsubscribeRate"
                          name="Unsubscribe Rate"
                          stroke="#FF0000"
                        />
                      </ReLineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Open vs. Click Comparison</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReBarChart
                            data={trendsData.slice(-6)}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 25,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date"
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis tickFormatter={(tick) => `${(tick * 100).toFixed(0)}%`} />
                            <Tooltip formatter={(value) => [`${(Number(value) * 100).toFixed(2)}%`, '']} />
                            <Legend />
                            <Bar dataKey="openRate" name="Open Rate" fill="#0088FE" />
                            <Bar dataKey="clickRate" name="Click Rate" fill="#00C49F" />
                          </ReBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Bounce & Unsubscribe Rate</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReLineChart
                            data={trendsData.slice(-6)}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 25,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date"
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis tickFormatter={(tick) => `${(tick * 100).toFixed(0)}%`} />
                            <Tooltip formatter={(value) => [`${(Number(value) * 100).toFixed(2)}%`, '']} />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="bounceRate"
                              name="Bounce Rate"
                              stroke="#FF8042"
                              activeDot={{ r: 6 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="unsubscribeRate"
                              name="Unsubscribe Rate"
                              stroke="#FF0000"
                              activeDot={{ r: 6 }}
                            />
                          </ReLineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Email Performance Insights</CardTitle>
                  <CardDescription>
                    Deeper insights into email campaign performance.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Device Distribution</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
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
                            <Tooltip formatter={(value) => [`${(Number(value) * 100).toFixed(2)}%`, '']} />
                            <Legend />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Open Time Distribution</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReBarChart
                            data={timeData}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" />
                            <YAxis />
                            <Tooltip formatter={(value) => [value, 'Opens']} />
                            <Legend />
                            <Bar dataKey="opens" name="Opens" fill="#8884d8" />
                          </ReBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Engagement Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Best Time to Send</h4>
                          <div className="text-xl font-bold flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-blue-500" />
                            {timeData.sort((a, b) => b.opens - a.opens)[0]?.time || 'N/A'}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Best Device</h4>
                          <div className="text-xl font-bold flex items-center">
                            <div className="mr-2 h-4 w-4 rounded-full bg-blue-500" />
                            {deviceData.sort((a, b) => b.value - a.value)[0]?.name || 'N/A'}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Best Campaign Type</h4>
                          <div className="text-xl font-bold flex items-center">
                            <div className="mr-2 h-4 w-4 rounded-full bg-green-500" />
                            {campaigns.sort((a, b) => b.clickRate - a.clickRate)[0]?.type || 'N/A'}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Avg. Click-to-Open</h4>
                          <div className="text-xl font-bold">
                            {overview.openRate > 0 
                              ? formatPercentage(overview.clickRate / overview.openRate) 
                              : '0%'}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default EmailAnalytics;