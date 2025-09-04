import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, AlertTriangle, CheckCircle, Database, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";

// Types for the API response
interface DataQualityMetrics {
  totals: { contacts: number };
  duplicates: { count: number; percent: number };
  missingEmail: { count: number; percent: number };
  fieldCompletion: { percent: number; byField: Record<string, number> };
  lifecycleValidity: { percent: number };
  generatedAt: string;
}

// Fetch data quality metrics
async function fetchDataQuality(): Promise<DataQualityMetrics> {
  const response = await fetch("/api/data/quality", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch data quality metrics");
  }

  return response.json();
}

// Fix duplicates API call
async function fixDuplicates(): Promise<void> {
  const response = await fetch("/api/data/quality/fix-duplicates", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to queue duplicate cleanup");
  }

  return response.json();
}

export default function DataQualityPage() {
  const { toast } = useToast();

  const {
    data: metrics,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['/api/data/quality'],
    queryFn: fetchDataQuality,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });

  const handleFixDuplicates = async () => {
    try {
      await fixDuplicates();
      toast({
        title: "Success",
        description: "Duplicate cleanup has been queued for processing",
      });
      // Refetch data after queuing the fix
      refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to queue duplicate cleanup",
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading data quality metrics...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !metrics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Data Quality Dashboard
            </CardTitle>
            <CardDescription>
              Unable to load data quality metrics at this time.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-gray-600 mb-4">
              There was an error loading the data quality analysis.
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare chart data for field completion
  const chartData = Object.entries(metrics.fieldCompletion.byField).map(([field, percent]) => ({
    field: field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
    percent: Math.round(percent),
    fill: percent >= 80 ? '#22c55e' : percent >= 60 ? '#f59e0b' : '#ef4444'
  }));

  // Calculate quality score (weighted average)
  const qualityScore = Math.round(
    (100 - metrics.duplicates.percent) * 0.3 +
    (100 - metrics.missingEmail.percent) * 0.3 +
    metrics.fieldCompletion.percent * 0.3 +
    metrics.lifecycleValidity.percent * 0.1
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Quality Dashboard</h1>
        <div className="flex items-center justify-between">
          <p className="text-gray-600">
            Analysis of {metrics.totals.contacts.toLocaleString()} contacts
          </p>
          <div className="flex items-center space-x-4">
            <Badge variant={getScoreBadgeVariant(qualityScore)} className="text-sm">
              Quality Score: {qualityScore}%
            </Badge>
            <Button 
              onClick={() => refetch()} 
              variant="outline" 
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Duplicates Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duplicate Emails</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${metrics.duplicates.percent > 5 ? 'text-red-500' : 'text-gray-400'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.duplicates.count}
            </div>
            <div className="text-xs text-gray-600">
              {metrics.duplicates.percent.toFixed(1)}% of total contacts
            </div>
            {metrics.duplicates.count > 0 && (
              <Button 
                onClick={handleFixDuplicates}
                size="sm" 
                variant="outline" 
                className="mt-2 w-full"
              >
                Fix Duplicates
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Missing Emails Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Emails</CardTitle>
            <Users className={`h-4 w-4 ${metrics.missingEmail.percent > 10 ? 'text-yellow-500' : 'text-gray-400'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {metrics.missingEmail.count}
            </div>
            <div className="text-xs text-gray-600">
              {metrics.missingEmail.percent.toFixed(1)}% of total contacts
            </div>
          </CardContent>
        </Card>

        {/* Field Completion Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Field Completion</CardTitle>
            <CheckCircle className={`h-4 w-4 ${metrics.fieldCompletion.percent >= 70 ? 'text-green-500' : 'text-yellow-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(metrics.fieldCompletion.percent)}`}>
              {metrics.fieldCompletion.percent.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">
              Average across all fields
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Field Completion Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Field Completion Rates
            </CardTitle>
            <CardDescription>
              Percentage of contacts with data for each field
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="field" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Completion']}
                  labelStyle={{ color: '#374151' }}
                />
                <Bar dataKey="percent" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Issues List */}
        <Card>
          <CardHeader>
            <CardTitle>Top Data Issues</CardTitle>
            <CardDescription>
              Issues ranked by impact on data quality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Issue 1: Duplicates */}
            {metrics.duplicates.count > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <h4 className="font-medium text-red-800">Duplicate Emails</h4>
                  <p className="text-sm text-red-600">
                    {metrics.duplicates.count} contacts with duplicate email addresses
                  </p>
                </div>
                <Badge variant="destructive">{metrics.duplicates.percent.toFixed(1)}%</Badge>
              </div>
            )}

            {/* Issue 2: Missing Emails */}
            {metrics.missingEmail.count > 0 && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                  <h4 className="font-medium text-yellow-800">Missing Email Addresses</h4>
                  <p className="text-sm text-yellow-600">
                    {metrics.missingEmail.count} contacts without email addresses
                  </p>
                </div>
                <Badge variant="secondary">{metrics.missingEmail.percent.toFixed(1)}%</Badge>
              </div>
            )}

            {/* Issue 3: Low completion fields */}
            {Object.entries(metrics.fieldCompletion.byField)
              .filter(([, percent]) => percent < 50)
              .sort(([, a], [, b]) => a - b)
              .slice(0, 2)
              .map(([field, percent]) => (
                <div key={field} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <h4 className="font-medium text-gray-800">
                      Low {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} Completion
                    </h4>
                    <p className="text-sm text-gray-600">
                      Many contacts missing {field.toLowerCase()} data
                    </p>
                  </div>
                  <Badge variant="outline">{percent.toFixed(1)}%</Badge>
                </div>
              ))}

            {/* All good message */}
            {metrics.duplicates.count === 0 && 
             metrics.missingEmail.count === 0 && 
             Object.values(metrics.fieldCompletion.byField).every(p => p >= 50) && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Great Data Quality!
                </h3>
                <p className="text-gray-600">
                  No major data quality issues detected.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        Last updated: {new Date(metrics.generatedAt).toLocaleString()}
      </div>
    </div>
  );
}