import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Separator 
} from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  Filter, 
  Target, 
  TrendingUp, 
  Mail, 
  PieChart, 
  Download,
  TestTube
} from "lucide-react";
import { Lead, Customer } from "@shared/schema";

interface SegmentCriteria {
  name: string;
  description: string;
  conditions: {
    field: string;
    operator: string;
    value: any;
  }[];
}

interface CustomerSegment {
  id: number;
  name: string;
  description: string;
  criteria: SegmentCriteria;
  leadCount: number;
  customerCount: number;
  conversionRate: number;
  avgScore: number;
  createdAt: string;
}

export default function CustomerSegmentation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("segments");
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | null>(null);

  // States for creating new segments
  const [segmentName, setSegmentName] = useState("");
  const [segmentDescription, setSegmentDescription] = useState("");
  const [criteria, setCriteria] = useState<SegmentCriteria['conditions']>([]);

  // Fetch leads and customers data
  const { data: leads = [], isLoading: isLoadingLeads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    retry: 1
  });

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    retry: 1 
  });

  // Fetch existing segments
  const { data: segments = [], isLoading: isLoadingSegments } = useQuery<CustomerSegment[]>({
    queryKey: ["/api/segments"],
    retry: 1
  });

  // Advanced segmentation analytics
  const segmentAnalytics = useMemo(() => {
    if (!leads.length && !customers.length) return [];

    // Industry-based segments
    const industrySegments = leads.reduce((acc: any, lead) => {
      const industry = lead.industry || 'Unknown';
      if (!acc[industry]) {
        acc[industry] = { leads: 0, totalScore: 0, highValueLeads: 0 };
      }
      acc[industry].leads++;
      acc[industry].totalScore += lead.score || 0;
      if ((lead.score || 0) >= 80) {
        acc[industry].highValueLeads++;
      }
      return acc;
    }, {});

    // Lead source segments  
    const sourceSegments = leads.reduce((acc: any, lead) => {
      const source = lead.leadSource || 'Unknown';
      if (!acc[source]) {
        acc[source] = { leads: 0, totalScore: 0, qualifiedLeads: 0 };
      }
      acc[source].leads++;
      acc[source].totalScore += lead.score || 0;
      if ((lead.leadStatus === 'qualified' || lead.leadStatus === 'proposal')) {
        acc[source].qualifiedLeads++;
      }
      return acc;
    }, {});

    // Engagement level segments
    const engagementSegments = {
      highEngagement: leads.filter(l => (l.engagementLevel || 0) >= 70),
      mediumEngagement: leads.filter(l => (l.engagementLevel || 0) >= 40 && (l.engagementLevel || 0) < 70),
      lowEngagement: leads.filter(l => (l.engagementLevel || 0) < 40)
    };

    return {
      industry: industrySegments,
      source: sourceSegments,
      engagement: engagementSegments
    };
  }, [leads, customers]);

  // Smart segmentation suggestions based on data patterns
  const smartSegmentSuggestions = useMemo(() => {
    if (!leads.length) return [];

    const suggestions = [];

    // High-value prospects
    const highValueLeads = leads.filter(l => (l.score || 0) >= 80);
    if (highValueLeads.length > 0) {
      suggestions.push({
        name: "High-Value Prospects",
        description: `${highValueLeads.length} leads with scores above 80`,
        criteria: "Lead Score >= 80",
        count: highValueLeads.length,
        type: "high-priority"
      });
    }

    // Engaged but unqualified
    const engagedUnqualified = leads.filter(l => 
      (l.engagementLevel || 0) >= 60 && 
      (l.leadStatus === 'new' || l.leadStatus === 'contacted')
    );
    if (engagedUnqualified.length > 0) {
      suggestions.push({
        name: "Engaged but Unqualified",
        description: `${engagedUnqualified.length} highly engaged leads needing qualification`,
        criteria: "Engagement >= 60 AND Status = New/Contacted",
        count: engagedUnqualified.length,
        type: "nurture"
      });
    }

    // Inactive high-score leads
    const inactiveHighScore = leads.filter(l => 
      (l.score || 0) >= 70 && 
      l.lastContactDate && 
      new Date(l.lastContactDate) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    if (inactiveHighScore.length > 0) {
      suggestions.push({
        name: "High-Score Inactive Leads",
        description: `${inactiveHighScore.length} high-scoring leads with no recent contact`,
        criteria: "Score >= 70 AND Last Contact > 30 days ago",
        count: inactiveHighScore.length,
        type: "re-engagement"
      });
    }

    return suggestions;
  }, [leads]);

  // Create segment mutation
  const createSegmentMutation = useMutation({
    mutationFn: (segmentData: any) => {
      return apiRequest('POST', '/api/segments', segmentData);
    },
    onSuccess: () => {
      toast({
        title: "Segment created",
        description: "Customer segment has been successfully created"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/segments"] });
      // Reset form
      setSegmentName("");
      setSegmentDescription("");
      setCriteria([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create segment. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Export segment data
  const exportSegmentMutation = useMutation({
    mutationFn: (segmentId: number) => {
      return apiRequest('GET', `/api/segments/${segmentId}/export`);
    },
    onSuccess: (data) => {
      // Create and download CSV file
      const csvContent = data.csvData;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `segment-${selectedSegment?.name || 'export'}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export complete",
        description: "Segment data has been exported successfully"
      });
    }
  });

  const addCriterion = () => {
    setCriteria([...criteria, { field: 'score', operator: 'gte', value: '' }]);
  };

  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const updateCriterion = (index: number, field: string, value: any) => {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    setCriteria(updated);
  };

  const handleCreateSegment = () => {
    if (!segmentName.trim() || criteria.length === 0) {
      toast({
        title: "Error",
        description: "Please provide segment name and at least one criterion",
        variant: "destructive"
      });
      return;
    }

    createSegmentMutation.mutate({
      name: segmentName,
      description: segmentDescription,
      criteria: {
        name: segmentName,
        description: segmentDescription,
        conditions: criteria
      }
    });
  };

  if (isLoadingLeads || isLoadingCustomers || isLoadingSegments) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customer Segmentation</h2>
          <p className="text-slate-500 mt-1">Create targeted segments for better campaign effectiveness</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
          <TabsTrigger value="create">Create Segment</TabsTrigger>
        </TabsList>

        {/* Existing Segments */}
        <TabsContent value="segments" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {segments.map((segment) => (
              <Card key={segment.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedSegment(segment)}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Target className="h-5 w-5 mr-2" />
                      {segment.name}
                    </span>
                    <div className="flex gap-2">
                      {segment.name.includes('(Demo)') && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          <TestTube className="h-3 w-3 mr-1" />
                          Demo
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {segment.leadCount + segment.customerCount} contacts
                      </Badge>
                    </div>
                  </CardTitle>
                  <CardDescription>{segment.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-500">Leads</div>
                      <div className="font-semibold">{segment.leadCount}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Customers</div>
                      <div className="font-semibold">{segment.customerCount}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Conversion Rate</div>
                      <div className="font-semibold">{(segment.conversionRate * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Avg Score</div>
                      <div className="font-semibold">{segment.avgScore}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Mail className="h-4 w-4 mr-1" />
                      Campaign
                    </Button>
                    <Button size="sm" variant="outline" 
                            onClick={(e) => {
                              e.stopPropagation();
                              exportSegmentMutation.mutate(segment.id);
                            }}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Segmentation Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Industry Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Industry Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(segmentAnalytics.industry || {}).map(([industry, data]: [string, any]) => (
                    <div key={industry} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                        <span className="font-medium">{industry}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>{data.leads} leads</span>
                        <Badge variant="outline">
                          Avg: {data.leads > 0 ? (data.totalScore / data.leads).toFixed(0) : 0}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Lead Source Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Source Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(segmentAnalytics.source || {}).map(([source, data]: [string, any]) => {
                    const qualificationRate = data.leads > 0 ? (data.qualifiedLeads / data.leads) * 100 : 0;
                    return (
                      <div key={source} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                          <span className="font-medium capitalize">{source}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span>{data.leads} leads</span>
                          <Badge variant={qualificationRate >= 50 ? "default" : "secondary"}>
                            {qualificationRate.toFixed(0)}% qualified
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Engagement Levels */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Engagement Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {segmentAnalytics.engagement?.highEngagement?.length || 0}
                    </div>
                    <div className="text-sm text-slate-500">High Engagement (70%+)</div>
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-green-50">
                        Ready for outreach
                      </Badge>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {segmentAnalytics.engagement?.mediumEngagement?.length || 0}
                    </div>
                    <div className="text-sm text-slate-500">Medium Engagement (40-69%)</div>
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-yellow-50">
                        Nurture candidates
                      </Badge>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {segmentAnalytics.engagement?.lowEngagement?.length || 0}
                    </div>
                    <div className="text-sm text-slate-500">Low Engagement (&lt;40%)</div>
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-red-50">
                        Re-engagement needed
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI-Powered Segmentation Suggestions */}
        <TabsContent value="suggestions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {smartSegmentSuggestions.map((suggestion, index) => (
              <Card key={index} className="border-dashed border-2 hover:border-solid transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Filter className="h-5 w-5 mr-2" />
                      {suggestion.name}
                    </span>
                    <Badge variant={
                      suggestion.type === 'high-priority' ? 'default' :
                      suggestion.type === 'nurture' ? 'secondary' : 'outline'
                    }>
                      {suggestion.count} contacts
                    </Badge>
                  </CardTitle>
                  <CardDescription>{suggestion.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-slate-600 mb-4">
                    <strong>Criteria:</strong> {suggestion.criteria}
                  </div>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => {
                      setSegmentName(suggestion.name);
                      setSegmentDescription(suggestion.description);
                      setActiveTab("create");
                    }}
                  >
                    Create This Segment
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Create New Segment */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Segment</CardTitle>
              <CardDescription>
                Define criteria to automatically group leads and customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="segment-name">Segment Name</Label>
                  <Input
                    id="segment-name"
                    value={segmentName}
                    onChange={(e) => setSegmentName(e.target.value)}
                    placeholder="e.g., High-Value Prospects"
                  />
                </div>
                <div>
                  <Label htmlFor="segment-description">Description</Label>
                  <Input
                    id="segment-description"
                    value={segmentDescription}
                    onChange={(e) => setSegmentDescription(e.target.value)}
                    placeholder="Describe this segment..."
                  />
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>Segmentation Criteria</Label>
                  <Button variant="outline" size="sm" onClick={addCriterion}>
                    Add Criterion
                  </Button>
                </div>

                <div className="space-y-4">
                  {criteria.map((criterion, index) => (
                    <div key={index} className="flex gap-4 items-center">
                      <Select value={criterion.field} onValueChange={(value) => updateCriterion(index, 'field', value)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="score">Lead Score</SelectItem>
                          <SelectItem value="engagementLevel">Engagement Level</SelectItem>
                          <SelectItem value="industry">Industry</SelectItem>
                          <SelectItem value="leadSource">Lead Source</SelectItem>
                          <SelectItem value="leadStatus">Lead Status</SelectItem>
                          <SelectItem value="location">Location</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={criterion.operator} onValueChange={(value) => updateCriterion(index, 'operator', value)}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eq">Equals</SelectItem>
                          <SelectItem value="ne">Not Equals</SelectItem>
                          <SelectItem value="gt">Greater Than</SelectItem>
                          <SelectItem value="gte">Greater/Equal</SelectItem>
                          <SelectItem value="lt">Less Than</SelectItem>
                          <SelectItem value="lte">Less/Equal</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        value={criterion.value}
                        onChange={(e) => updateCriterion(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1"
                      />

                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeCriterion(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => {
                  setSegmentName("");
                  setSegmentDescription("");
                  setCriteria([]);
                }}>
                  Reset
                </Button>
                <Button 
                  onClick={handleCreateSegment}
                  disabled={createSegmentMutation.isPending}
                >
                  {createSegmentMutation.isPending ? "Creating..." : "Create Segment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}