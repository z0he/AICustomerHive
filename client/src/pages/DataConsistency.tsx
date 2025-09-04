import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Components
import AuthHeader from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  TrendingUp,
  Database,
  Settings,
  Activity,
  Users,
  Target,
  Route,
  BarChart3
} from "lucide-react";

interface DataAuditResult {
  issues: Array<{ 
    type: string; 
    description: string; 
    severity: 'low' | 'medium' | 'high' 
  }>;
  fixes: Array<{ 
    type: string; 
    description: string; 
    recordsAffected: number 
  }>;
  summary: {
    totalIssuesFound: number;
    totalIssuesFixed: number;
    criticalIssuesRemaining: number;
  };
}

interface HealthScore {
  overallScore: number;
  categoryScores: {
    industryConsistency: number;
    journeyStageIntegrity: number;
    contactDataNormalization: number;
    touchpointIntegrity: number;
    segmentConsistency: number;
  };
  recommendations: string[];
}

export default function DataConsistency() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch data consistency health score
  const { data: healthScore, isLoading: isLoadingHealth, refetch: refetchHealth } = useQuery<HealthScore>({
    queryKey: ["/api/data-consistency/health"],
    retry: 1
  });

  // Fetch audit results
  const { data: auditResults, isLoading: isLoadingAudit, refetch: refetchAudit } = useQuery<DataAuditResult>({
    queryKey: ["/api/data-consistency/audit"],
    retry: 1,
    enabled: false // Only run when explicitly requested
  });

  // Run data consistency fixes
  const fixDataMutation = useMutation({
    mutationFn: () => apiRequest('/api/data-consistency/fix', { method: 'POST' }),
    onSuccess: () => {
      toast({
        title: "Data consistency fixes completed",
        description: "All identified issues have been resolved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/data-consistency/health"] });
      queryClient.invalidateQueries({ queryKey: ["/api/data-consistency/audit"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to run data consistency fixes.",
        variant: "destructive",
      });
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-orange-600 bg-orange-100';
      case 'low': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <XCircle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <AlertTriangle className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-orange-500';
    return 'text-red-500';
  };

  const categoryIcons = {
    industryConsistency: <Database className="h-5 w-5" />,
    journeyStageIntegrity: <Route className="h-5 w-5" />,
    contactDataNormalization: <Users className="h-5 w-5" />,
    touchpointIntegrity: <Target className="h-5 w-5" />,
    segmentConsistency: <BarChart3 className="h-5 w-5" />
  };

  const categoryLabels = {
    industryConsistency: 'Industry Consistency',
    journeyStageIntegrity: 'Journey Stage Integrity',
    contactDataNormalization: 'Contact Data Normalization',
    touchpointIntegrity: 'Touchpoint Integrity',
    segmentConsistency: 'Segment Consistency'
  };

  if (isLoadingHealth) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AuthHeader />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-slate-200 rounded w-1/3"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 bg-slate-200 rounded"></div>
                ))}
              </div>
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
                  <Shield className="mr-3 h-8 w-8 text-primary" />
                  Data Consistency
                </h1>
                <p className="text-slate-500 mt-1">
                  Monitor and maintain data integrity across your CRM system
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    refetchHealth();
                    refetchAudit();
                  }}
                  disabled={isLoadingHealth || isLoadingAudit}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button 
                  onClick={() => fixDataMutation.mutate()}
                  disabled={fixDataMutation.isPending}
                  size="sm"
                >
                  {fixDataMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                  Run Fixes
                </Button>
              </div>
            </div>
          </div>

          {/* Overall Health Score */}
          {healthScore && (
            <div className="mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Data Consistency Health Score</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${getScoreColor(healthScore.overallScore)}`}>
                          {healthScore.overallScore}%
                        </div>
                        <p className="text-sm text-slate-600">Overall Score</p>
                      </div>
                      <div className="flex-1 max-w-md">
                        <Progress 
                          value={healthScore.overallScore} 
                          className="h-3"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {healthScore.overallScore >= 90 ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Excellent
                        </Badge>
                      ) : healthScore.overallScore >= 70 ? (
                        <Badge className="bg-orange-100 text-orange-800">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Good
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">
                          <XCircle className="mr-1 h-3 w-3" />
                          Needs Attention
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Category Scores */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {Object.entries(healthScore.categoryScores).map(([category, score]) => (
                      <div key={category} className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="flex justify-center mb-2">
                          {categoryIcons[category as keyof typeof categoryIcons]}
                        </div>
                        <div className={`text-lg font-semibold ${getScoreColor(score)}`}>
                          {score}%
                        </div>
                        <p className="text-xs text-slate-600">
                          {categoryLabels[category as keyof typeof categoryLabels]}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recommendations */}
          {healthScore?.recommendations && healthScore.recommendations.length > 0 && (
            <div className="mb-6">
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  <strong>Recommendations:</strong>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {healthScore.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview" className="flex items-center">
                <BarChart3 className="mr-2 h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center" onClick={() => refetchAudit()}>
                <Settings className="mr-2 h-4 w-4" />
                Detailed Audit
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Category Details */}
              {healthScore && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(healthScore.categoryScores).map(([category, score]) => (
                    <Card key={category}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          {categoryIcons[category as keyof typeof categoryIcons]}
                          <span>{categoryLabels[category as keyof typeof categoryLabels]}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-3">
                          <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                            {score}%
                          </div>
                          <Badge variant={score >= 90 ? 'default' : score >= 70 ? 'secondary' : 'destructive'}>
                            {score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : 'Needs Work'}
                          </Badge>
                        </div>
                        <Progress value={score} className="h-2" />
                        <p className="text-sm text-slate-600 mt-2">
                          {category === 'industryConsistency' && 'Industry field standardization across leads and customers'}
                          {category === 'journeyStageIntegrity' && 'Journey stage references and touchpoint consistency'}
                          {category === 'contactDataNormalization' && 'Contact data format standardization and completeness'}
                          {category === 'touchpointIntegrity' && 'Touchpoint referential integrity and validation'}
                          {category === 'segmentConsistency' && 'Segment filter criteria and data consistency'}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="audit" className="space-y-6">
              {isLoadingAudit ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Running data consistency audit...</span>
                    </div>
                  </CardContent>
                </Card>
              ) : auditResults ? (
                <div className="space-y-6">
                  {/* Audit Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Audit Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {auditResults.summary.totalIssuesFound}
                          </div>
                          <p className="text-sm text-blue-700">Issues Found</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {auditResults.summary.totalIssuesFixed}
                          </div>
                          <p className="text-sm text-green-700">Issues Fixed</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">
                            {auditResults.summary.criticalIssuesRemaining}
                          </div>
                          <p className="text-sm text-red-700">Critical Issues</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Issues Found */}
                  {auditResults.issues.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Issues Identified</CardTitle>
                        <CardDescription>
                          Data consistency issues found during the audit
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {auditResults.issues.map((issue, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                              <div className={`p-1 rounded ${getSeverityColor(issue.severity)}`}>
                                {getSeverityIcon(issue.severity)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium">{issue.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                                  <Badge variant="outline" className={getSeverityColor(issue.severity)}>
                                    {issue.severity}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-600 mt-1">{issue.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Fixes Applied */}
                  {auditResults.fixes.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Fixes Applied</CardTitle>
                        <CardDescription>
                          Data consistency fixes that were automatically applied
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {auditResults.fixes.map((fix, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg bg-green-50">
                              <div className="p-1 rounded bg-green-100 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium">{fix.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                                  <Badge variant="secondary">
                                    {fix.recordsAffected} records
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-600 mt-1">{fix.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Database className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600">Click "Detailed Audit" tab to run a comprehensive data consistency check.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}