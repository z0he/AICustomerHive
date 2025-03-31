import { FC } from "react";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface Lead {
  id: number;
  name: string;
  initials: string;
  industry: string;
  location: string;
  score: number;
}

interface LeadScoringProps {
  topLeads: Lead[];
}

const LeadScoring: FC<LeadScoringProps> = ({ topLeads }) => {
  return (
    <Card>
      <CardHeader className="flex justify-between items-center pb-2">
        <CardTitle>Top Leads</CardTitle>
        <button className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center">
          <span>View All</span>
          <ArrowRight className="ml-1" size={16} />
        </button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topLeads.map((lead) => (
            <div key={lead.id} className="flex items-center justify-between py-1">
              <div className="flex items-center">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-slate-200 text-slate-700">
                    {lead.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-800">{lead.name}</p>
                  <p className="text-xs text-slate-500">{lead.industry} • {lead.location}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Progress 
                  value={lead.score} 
                  className="h-2 w-24 bg-slate-100"
                />
                <span className="ml-2 text-xs font-medium text-slate-800">{lead.score}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadScoring;
