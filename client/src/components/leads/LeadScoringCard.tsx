import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  LineChart, 
  TrendingUp, 
  TrendingDown 
} from "lucide-react";

interface LeadScoringCardProps {
  lead: any;
  onUpdateScore: (scoringData: any) => void;
  isUpdating?: boolean;
}

export default function LeadScoringCard({ lead, onUpdateScore, isUpdating = false }: LeadScoringCardProps) {
  // State for each scoring factor
  const [engagementLevel, setEngagementLevel] = useState(lead.engagementLevel || 0);
  const [companyValue, setCompanyValue] = useState(50); // Default mid-value
  const [interactionRecency, setInteractionRecency] = useState(50); // Default mid-value
  const [contentEngagement, setContentEngagement] = useState(30); // Default value
  const [socialEngagement, setSocialEngagement] = useState(30); // Default value
  
  // Calculate predicted score
  const calculatePredictedScore = () => {
    let predictedScore = 0;
    
    // Apply the same algorithm as in the backend
    predictedScore += engagementLevel * 0.3; // 30% weight
    predictedScore += companyValue * 0.2; // 20% weight
    predictedScore += interactionRecency * 0.2; // 20% weight
    predictedScore += contentEngagement * 0.15; // 15% weight
    predictedScore += socialEngagement * 0.15; // 15% weight
    
    return Math.max(0, Math.min(100, Math.round(predictedScore)));
  };
  
  // Calculate score change
  const scoreChange = calculatePredictedScore() - (lead.score || 0);
  
  // Handle score update
  const handleUpdateScore = () => {
    onUpdateScore({
      engagementLevel,
      companyValue,
      interactionRecency,
      contentEngagement,
      socialEngagement
    });
  };
  
  // Helper functions for UI
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };
  
  const getScoreLabel = (score: number) => {
    if (score >= 80) return "High Value";
    if (score >= 60) return "Good";
    if (score >= 40) return "Average";
    if (score >= 20) return "Low";
    return "Very Low";
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Lead Score</span>
          <div className={`text-2xl font-bold ${getScoreColor(lead.score || 0)}`}>
            {lead.score || 0}
            <Badge 
              variant={scoreChange > 0 ? "success" : scoreChange < 0 ? "destructive" : "outline"}
              className="ml-2 text-xs"
            >
              {scoreChange > 0 ? `+${scoreChange}` : scoreChange}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          {getScoreLabel(lead.score || 0)} - Adjust factors to recalculate score
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium">Engagement Level</label>
            <span className="text-sm">{engagementLevel}</span>
          </div>
          <Slider
            value={[engagementLevel]}
            min={0}
            max={100}
            step={1}
            onValueChange={(values) => setEngagementLevel(values[0])}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium">Company Value</label>
            <span className="text-sm">{companyValue}</span>
          </div>
          <Slider
            value={[companyValue]}
            min={0}
            max={100}
            step={1}
            onValueChange={(values) => setCompanyValue(values[0])}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium">Interaction Recency</label>
            <span className="text-sm">{interactionRecency}</span>
          </div>
          <Slider
            value={[interactionRecency]}
            min={0}
            max={100}
            step={1}
            onValueChange={(values) => setInteractionRecency(values[0])}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium">Content Engagement</label>
            <span className="text-sm">{contentEngagement}</span>
          </div>
          <Slider
            value={[contentEngagement]}
            min={0}
            max={100}
            step={1}
            onValueChange={(values) => setContentEngagement(values[0])}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium">Social Media Engagement</label>
            <span className="text-sm">{socialEngagement}</span>
          </div>
          <Slider
            value={[socialEngagement]}
            min={0}
            max={100}
            step={1}
            onValueChange={(values) => setSocialEngagement(values[0])}
          />
        </div>
        
        <div className="bg-slate-50 p-3 rounded-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Predicted Score:</span>
            <span className={`font-bold ${getScoreColor(calculatePredictedScore())}`}>
              {calculatePredictedScore()}
            </span>
          </div>
          <div className="flex items-center text-xs text-slate-500">
            {scoreChange > 0 ? (
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
            ) : scoreChange < 0 ? (
              <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
            ) : (
              <LineChart className="w-3 h-3 mr-1 text-slate-500" />
            )}
            <span>
              {scoreChange > 0 
                ? `${scoreChange} point increase` 
                : scoreChange < 0 
                  ? `${Math.abs(scoreChange)} point decrease`
                  : "No change"
              }
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleUpdateScore}
          disabled={isUpdating || scoreChange === 0}
        >
          {isUpdating ? "Updating..." : "Update Lead Score"}
        </Button>
      </CardFooter>
    </Card>
  );
}