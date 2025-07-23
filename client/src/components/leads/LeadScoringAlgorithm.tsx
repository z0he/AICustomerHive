import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Zap, 
  BarChart3, 
  Settings,
  Save,
  RefreshCw
} from "lucide-react";
import { Lead } from "@shared/schema";

interface ScoringWeights {
  engagementLevel: number;
  companySize: number;
  industryMatch: number;
  leadSource: number;
  contactFrequency: number;
  emailInteraction: number;
  websiteActivity: number;
  socialEngagement: number;
  demographicFit: number;
  behavioralSignals: number;
}

interface ScoringRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  points: number;
  weight: number;
  active: boolean;
}

interface LeadScoringAlgorithmProps {
  lead?: Lead;
  onScoreUpdate?: (newScore: number, breakdown: any) => void;
  mode?: 'individual' | 'global';
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  engagementLevel: 25,
  companySize: 15,
  industryMatch: 12,
  leadSource: 10,
  contactFrequency: 8,
  emailInteraction: 8,
  websiteActivity: 7,
  socialEngagement: 5,
  demographicFit: 5,
  behavioralSignals: 5
};

const DEFAULT_SCORING_RULES: ScoringRule[] = [
  {
    id: 'high-engagement',
    name: 'High Engagement Level (Demo Rule)',
    description: 'Demo: Lead has high engagement (70%+)',
    condition: 'engagementLevel >= 70',
    points: 25,
    weight: 1,
    active: true
  },
  {
    id: 'enterprise-company',
    name: 'Enterprise Company (Demo Rule)',
    description: 'Demo: Company size indicates enterprise potential',
    condition: 'companySize === "enterprise"',
    points: 20,
    weight: 1,
    active: true
  },
  {
    id: 'target-industry',
    name: 'Target Industry Match (Demo Rule)',
    description: 'Demo: Lead is in a target industry',
    condition: 'industry in ["Technology", "Healthcare", "Finance"]',
    points: 15,
    weight: 1,
    active: true
  },
  {
    id: 'high-value-source',
    name: 'High-Value Lead Source',
    description: 'Lead came from high-converting source',
    condition: 'leadSource in ["referral", "website", "advertisement"]',
    points: 12,
    weight: 1,
    active: true
  },
  {
    id: 'recent-contact',
    name: 'Recent Contact Activity',
    description: 'Lead was contacted within last 7 days',
    condition: 'lastContactDate <= 7 days ago',
    points: 10,
    weight: 1,
    active: true
  },
  {
    id: 'email-engagement',
    name: 'Email Engagement',
    description: 'High email open/click rates',
    condition: 'emailOpenRate > 0.5 AND emailClickRate > 0.2',
    points: 8,
    weight: 1,
    active: true
  },
  {
    id: 'website-visits',
    name: 'Multiple Website Visits',
    description: 'Lead has visited website multiple times',
    condition: 'websiteVisits >= 3',
    points: 6,
    weight: 1,
    active: true
  },
  {
    id: 'social-activity',
    name: 'Social Media Engagement',
    description: 'Active on social media with company',
    condition: 'socialEngagement > 0',
    points: 5,
    weight: 1,
    active: true
  }
];

export default function LeadScoringAlgorithm({ 
  lead, 
  onScoreUpdate, 
  mode = 'individual' 
}: LeadScoringAlgorithmProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("algorithm");
  const [weights, setWeights] = useState<ScoringWeights>(DEFAULT_WEIGHTS);
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>(DEFAULT_SCORING_RULES);
  const [isModified, setIsModified] = useState(false);

  // Calculate lead score based on current algorithm
  const scoreBreakdown = useMemo(() => {
    if (!lead) return null;

    let totalScore = 0;
    const breakdown: any = {};

    // Apply weighted scoring factors
    Object.entries(weights).forEach(([factor, weight]) => {
      let factorScore = 0;
      
      switch (factor) {
        case 'engagementLevel':
          factorScore = (lead.engagementLevel || 0) * (weight / 100);
          break;
        case 'companySize':
          // Mock company size scoring based on company name/industry
          const companyScore = lead.company?.length || 0 > 10 ? 80 : 50;
          factorScore = companyScore * (weight / 100);
          break;
        case 'industryMatch':
          const targetIndustries = ['Technology', 'Healthcare', 'Finance'];
          const industryScore = targetIndustries.includes(lead.industry || '') ? 90 : 40;
          factorScore = industryScore * (weight / 100);
          break;
        case 'leadSource':
          const sourceScores: { [key: string]: number } = {
            'referral': 90,
            'website': 80,
            'advertisement': 70,
            'email_campaign': 60,
            'conference': 75,
            'social_media': 55
          };
          const sourceScore = sourceScores[lead.leadSource || ''] || 40;
          factorScore = sourceScore * (weight / 100);
          break;
        case 'contactFrequency':
          // Calculate based on last contact date
          const daysSinceContact = lead.lastContactDate 
            ? Math.floor((Date.now() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
            : 999;
          const contactScore = Math.max(0, 100 - daysSinceContact * 5);
          factorScore = contactScore * (weight / 100);
          break;
        case 'emailInteraction':
          // Mock email interaction scoring
          factorScore = 60 * (weight / 100);
          break;
        case 'websiteActivity':
          // Mock website activity scoring
          factorScore = 45 * (weight / 100);
          break;
        case 'socialEngagement':
          // Mock social engagement scoring
          factorScore = 30 * (weight / 100);
          break;
        case 'demographicFit':
          // Mock demographic fit scoring
          factorScore = 70 * (weight / 100);
          break;
        case 'behavioralSignals':
          // Mock behavioral signals scoring
          factorScore = 55 * (weight / 100);
          break;
      }

      breakdown[factor] = factorScore;
      totalScore += factorScore;
    });

    // Apply scoring rules
    let ruleBonus = 0;
    scoringRules.filter(rule => rule.active).forEach(rule => {
      let ruleApplies = false;
      
      // Simple rule evaluation (in real implementation, use a proper rule engine)
      switch (rule.id) {
        case 'high-engagement':
          ruleApplies = (lead.engagementLevel || 0) >= 70;
          break;
        case 'enterprise-company':
          ruleApplies = (lead.company?.length || 0) > 15;
          break;
        case 'target-industry':
          ruleApplies = ['Technology', 'Healthcare', 'Finance'].includes(lead.industry || '');
          break;
        case 'high-value-source':
          ruleApplies = ['referral', 'website', 'advertisement'].includes(lead.leadSource || '');
          break;
        case 'recent-contact':
          if (lead.lastContactDate) {
            const daysSince = Math.floor((Date.now() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60 * 24));
            ruleApplies = daysSince <= 7;
          }
          break;
        default:
          ruleApplies = Math.random() > 0.5; // Mock for other rules
      }

      if (ruleApplies) {
        ruleBonus += rule.points * rule.weight;
        breakdown[`rule_${rule.id}`] = rule.points * rule.weight;
      }
    });

    const finalScore = Math.min(100, Math.max(0, totalScore + ruleBonus));
    
    return {
      totalScore: finalScore,
      weightedFactors: breakdown,
      ruleBonus,
      appliedRules: scoringRules.filter(rule => 
        rule.active && breakdown[`rule_${rule.id}`] !== undefined
      )
    };
  }, [lead, weights, scoringRules]);

  // Save scoring configuration
  const saveConfigurationMutation = useMutation({
    mutationFn: (config: { weights: ScoringWeights; rules: ScoringRule[] }) => {
      return apiRequest('POST', '/api/lead-scoring/config', config);
    },
    onSuccess: () => {
      toast({
        title: "Configuration saved",
        description: "Lead scoring algorithm has been updated"
      });
      setIsModified(false);
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive"
      });
    }
  });

  // Recalculate all lead scores
  const recalculateScoresMutation = useMutation({
    mutationFn: () => {
      return apiRequest('POST', '/api/lead-scoring/recalculate');
    },
    onSuccess: () => {
      toast({
        title: "Scores recalculated",
        description: "All lead scores have been updated with the new algorithm"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    }
  });

  const updateWeight = (factor: keyof ScoringWeights, value: number) => {
    setWeights(prev => ({ ...prev, [factor]: value }));
    setIsModified(true);
  };

  const toggleRule = (ruleId: string) => {
    setScoringRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, active: !rule.active } : rule
    ));
    setIsModified(true);
  };

  const updateRulePoints = (ruleId: string, points: number) => {
    setScoringRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, points } : rule
    ));
    setIsModified(true);
  };

  // Notify parent component of score changes
  useEffect(() => {
    if (scoreBreakdown && onScoreUpdate) {
      onScoreUpdate(scoreBreakdown.totalScore, scoreBreakdown);
    }
  }, [scoreBreakdown, onScoreUpdate]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Hot Lead";
    if (score >= 60) return "Warm Lead";
    if (score >= 40) return "Cold Lead";
    return "Unqualified";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Lead Scoring Algorithm
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Configure intelligent lead scoring based on multiple factors
          </p>
        </div>
        {isModified && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setWeights(DEFAULT_WEIGHTS);
                setScoringRules(DEFAULT_SCORING_RULES);
                setIsModified(false);
              }}
            >
              Reset
            </Button>
            <Button 
              onClick={() => saveConfigurationMutation.mutate({ weights, rules: scoringRules })}
              disabled={saveConfigurationMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveConfigurationMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="algorithm">Algorithm</TabsTrigger>
          <TabsTrigger value="weights">Weights</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Algorithm Overview */}
        <TabsContent value="algorithm" className="space-y-6">
          {lead && scoreBreakdown && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Lead Score</span>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getScoreColor(scoreBreakdown.totalScore)}>
                      {getScoreLabel(scoreBreakdown.totalScore)}
                    </Badge>
                    <div className={`text-2xl font-bold ${getScoreColor(scoreBreakdown.totalScore)}`}>
                      {Math.round(scoreBreakdown.totalScore)}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={scoreBreakdown.totalScore} className="mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-500">Base Score (Weighted Factors)</div>
                    <div className="font-semibold">
                      {Math.round(scoreBreakdown.totalScore - scoreBreakdown.ruleBonus)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Rule Bonuses</div>
                    <div className="font-semibold">+{Math.round(scoreBreakdown.ruleBonus)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Algorithm Configuration
              </CardTitle>
              <CardDescription>
                Fine-tune the lead scoring algorithm to match your business needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Total Scoring Factors</div>
                    <div className="text-sm text-slate-500">
                      {Object.keys(weights).length} weighted factors
                    </div>
                  </div>
                  <Badge variant="outline">
                    {Object.values(weights).reduce((sum, weight) => sum + weight, 0)}% Total Weight
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Active Scoring Rules</div>
                    <div className="text-sm text-slate-500">
                      {scoringRules.filter(rule => rule.active).length} of {scoringRules.length} rules active
                    </div>
                  </div>
                  <Badge variant="outline">
                    +{scoringRules.filter(rule => rule.active).reduce((sum, rule) => sum + rule.points, 0)} Max Bonus
                  </Badge>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button 
                    onClick={() => recalculateScoresMutation.mutate()}
                    disabled={recalculateScoresMutation.isPending}
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {recalculateScoresMutation.isPending ? "Recalculating..." : "Recalculate All Scores"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scoring Weights */}
        <TabsContent value="weights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scoring Factor Weights</CardTitle>
              <CardDescription>
                Adjust the importance of each factor in the overall lead score calculation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(weights).map(([factor, weight]) => (
                  <div key={factor} className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="capitalize">
                        {factor.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </Label>
                      <span className="text-sm font-medium">{weight}%</span>
                    </div>
                    <Slider
                      value={[weight]}
                      onValueChange={([value]) => updateWeight(factor as keyof ScoringWeights, value)}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scoring Rules */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scoring Rules</CardTitle>
              <CardDescription>
                Define bonus point rules that trigger when specific conditions are met
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scoringRules.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={rule.active}
                            onChange={() => toggleRule(rule.id)}
                            className="rounded"
                          />
                          <div>
                            <div className="font-medium">{rule.name}</div>
                            <div className="text-sm text-slate-500">{rule.description}</div>
                          </div>
                        </div>
                      </div>
                      <Badge variant={rule.active ? "default" : "secondary"}>
                        +{rule.points} points
                      </Badge>
                    </div>
                    
                    <div className="text-xs bg-slate-50 p-2 rounded font-mono mb-3">
                      {rule.condition}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`points-${rule.id}`} className="text-xs">Points:</Label>
                        <Input
                          id={`points-${rule.id}`}
                          type="number"
                          value={rule.points}
                          onChange={(e) => updateRulePoints(rule.id, parseInt(e.target.value) || 0)}
                          className="w-20 h-8 text-xs"
                          min="0"
                          max="50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview */}
        <TabsContent value="preview" className="space-y-6">
          {lead && scoreBreakdown && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Score Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(scoreBreakdown.weightedFactors)
                      .filter(([key]) => !key.startsWith('rule_'))
                      .map(([factor, value]) => (
                      <div key={factor} className="flex justify-between items-center">
                        <div className="text-sm capitalize">
                          {factor.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </div>
                        <div className="text-sm font-medium">
                          {Math.round(value as number)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Applied Rules
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {scoreBreakdown.appliedRules.map((rule) => (
                      <div key={rule.id} className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium">{rule.name}</div>
                          <div className="text-xs text-slate-500">{rule.description}</div>
                        </div>
                        <Badge variant="outline" className="text-green-600">
                          +{rule.points}
                        </Badge>
                      </div>
                    ))}
                    {scoreBreakdown.appliedRules.length === 0 && (
                      <div className="text-sm text-slate-500 text-center py-4">
                        No bonus rules applied
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}