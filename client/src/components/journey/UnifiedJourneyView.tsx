import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { 
  Route, 
  Users, 
  TrendingUp, 
  Clock, 
  Target,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Star,
  Eye,
  MessageCircle,
  ShoppingCart,
  Heart
} from "lucide-react";
import { Contact, CustomerTouchpoint, JourneyStage } from "@shared/schema";

interface UnifiedJourneyViewProps {
  contact: Contact;
  onActionClick?: (action: string, contact: Contact) => void;
}

interface JourneyAnalytics {
  currentStage: string;
  stageHistory: Array<{ stage: string; date: Date; touchpoints: number }>;
  journeyScore: number;
  timeInStage: number;
  nextRecommendedAction: string;
}

export default function UnifiedJourneyView({ contact, onActionClick }: UnifiedJourneyViewProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // Fetch journey analytics for this contact
  const { data: journeyAnalytics, isLoading: isLoadingAnalytics } = useQuery<JourneyAnalytics>({
    queryKey: [`/api/contacts/${contact.id}/journey-analytics`, { contactType: contact.contactType }],
    retry: 1
  });

  // Fetch all touchpoints for this contact
  const { data: touchpoints = [], isLoading: isLoadingTouchpoints } = useQuery<CustomerTouchpoint[]>({
    queryKey: [`/api/contacts/${contact.id}/touchpoints`, { contactType: contact.contactType }],
    retry: 1
  });

  // Fetch journey stages
  const { data: journeyStages = [] } = useQuery<JourneyStage[]>({
    queryKey: ["/api/journey-stages"],
    retry: 1
  });

  // Journey stage configuration with unified approach
  const journeyStageConfig = useMemo(() => {
    return {
      awareness: { 
        icon: <Eye className="h-5 w-5" />, 
        color: "bg-blue-500", 
        label: "Awareness",
        description: "Initial contact and brand discovery"
      },
      consideration: { 
        icon: <MessageCircle className="h-5 w-5" />, 
        color: "bg-orange-500", 
        label: "Consideration",
        description: "Evaluating solutions and comparing options"
      },
      decision: { 
        icon: <ShoppingCart className="h-5 w-5" />, 
        color: "bg-yellow-500", 
        label: "Decision",
        description: "Making purchase decision"
      },
      onboarding: { 
        icon: <CheckCircle className="h-5 w-5" />, 
        color: "bg-green-500", 
        label: "Onboarding",
        description: "New customer setup and activation"
      },
      retention: { 
        icon: <Heart className="h-5 w-5" />, 
        color: "bg-purple-500", 
        label: "Retention",
        description: "Ongoing customer relationship"
      },
      advocacy: { 
        icon: <Star className="h-5 w-5" />, 
        color: "bg-pink-500", 
        label: "Advocacy",
        description: "Brand promoter and referral source"
      }
    };
  }, []);

  const getStageProgress = (stageName: string) => {
    if (!journeyAnalytics) return 0;
    
    const stageOrder = ['awareness', 'consideration', 'decision', 'onboarding', 'retention', 'advocacy'];
    const currentIndex = stageOrder.indexOf(journeyAnalytics.currentStage);
    const stageIndex = stageOrder.indexOf(stageName);
    
    if (stageIndex < currentIndex) return 100;
    if (stageIndex === currentIndex) return journeyAnalytics.journeyScore;
    return 0;
  };

  const getStageStatus = (stageName: string) => {
    if (!journeyAnalytics) return 'pending';
    
    const stageOrder = ['awareness', 'consideration', 'decision', 'onboarding', 'retention', 'advocacy'];
    const currentIndex = stageOrder.indexOf(journeyAnalytics.currentStage);
    const stageIndex = stageOrder.indexOf(stageName);
    
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getStageTouchpoints = (stageName: string) => {
    return touchpoints.filter(t => t.touchpointStage === stageName);
  };

  if (isLoadingAnalytics || isLoadingTouchpoints) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Route className="h-5 w-5" />
            <span>Journey Map</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contact Journey Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Route className="h-5 w-5" />
              <span>Journey Map: {contact.name}</span>
            </div>
            <Badge variant={contact.contactType === 'lead' ? 'secondary' : 'default'}>
              {contact.contactType === 'lead' ? 'Lead' : 'Customer'}
            </Badge>
          </CardTitle>
          {journeyAnalytics && (
            <div className="flex items-center space-x-4 text-sm text-slate-600">
              <div className="flex items-center space-x-1">
                <Target className="h-4 w-4" />
                <span>Stage: {journeyStageConfig[journeyAnalytics.currentStage as keyof typeof journeyStageConfig]?.label}</span>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4" />
                <span>Score: {journeyAnalytics.journeyScore}/100</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{journeyAnalytics.timeInStage} days in stage</span>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Journey Stage Visualization */}
          <div className="space-y-8">
            {Object.entries(journeyStageConfig).map(([stageName, config], index) => {
              const progress = getStageProgress(stageName);
              const status = getStageStatus(stageName);
              const stageTouchpoints = getStageTouchpoints(stageName);
              const isActive = status === 'active';
              const isCompleted = status === 'completed';

              return (
                <div key={stageName} className="relative">
                  {/* Connection line to next stage */}
                  {index < Object.keys(journeyStageConfig).length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-16 bg-slate-200"></div>
                  )}
                  
                  <div className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    isActive 
                      ? 'border-brand-blue bg-brand-blue/5 shadow-md' 
                      : isCompleted 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-slate-200 bg-slate-50'
                  }`}
                  onClick={() => setSelectedStage(selectedStage === stageName ? null : stageName)}
                  >
                    {/* Stage Icon */}
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full text-white ${config.color}`}>
                      {isCompleted ? <CheckCircle className="h-6 w-6" /> : config.icon}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{config.label}</h3>
                          <p className="text-sm text-slate-600">{config.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={isActive ? 'default' : isCompleted ? 'secondary' : 'outline'}>
                            {stageTouchpoints.length} touchpoints
                          </Badge>
                          {isActive && (
                            <Badge variant="default" className="bg-brand-blue">
                              Current
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      {/* Expanded stage details */}
                      {selectedStage === stageName && stageTouchpoints.length > 0 && (
                        <div className="mt-4 p-4 bg-white rounded border">
                          <h4 className="font-medium mb-3">Recent Touchpoints</h4>
                          <div className="space-y-2">
                            {stageTouchpoints.slice(0, 3).map((touchpoint, i) => (
                              <div key={touchpoint.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                  <span>{touchpoint.description}</span>
                                </div>
                                <span className="text-slate-500">
                                  {format(new Date(touchpoint.createdAt), 'MMM d')}
                                </span>
                              </div>
                            ))}
                            {stageTouchpoints.length > 3 && (
                              <div className="text-xs text-slate-500 text-center">
                                +{stageTouchpoints.length - 3} more touchpoints
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Next Recommended Action */}
      {journeyAnalytics && journeyAnalytics.nextRecommendedAction && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Recommended Next Action</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">{journeyAnalytics.nextRecommendedAction}</p>
                  <p className="text-sm text-blue-700">
                    Based on {journeyAnalytics.timeInStage} days in {journeyStageConfig[journeyAnalytics.currentStage as keyof typeof journeyStageConfig]?.label} stage
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => onActionClick?.(journeyAnalytics.nextRecommendedAction, contact)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Take Action
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Journey Statistics */}
      {journeyAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{journeyAnalytics.journeyScore}</p>
                  <p className="text-sm text-slate-600">Journey Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Route className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{journeyAnalytics.stageHistory.length}</p>
                  <p className="text-sm text-slate-600">Stages Visited</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{touchpoints.length}</p>
                  <p className="text-sm text-slate-600">Total Touchpoints</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}