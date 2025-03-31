import { FC } from "react";
import { ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Campaign {
  id: number;
  name: string;
  conversions: number;
  percentage: number;
}

interface CampaignPerformanceProps {
  campaigns: Campaign[];
  selectedPeriod: string;
  onPeriodChange: (value: string) => void;
}

const CampaignPerformance: FC<CampaignPerformanceProps> = ({
  campaigns,
  selectedPeriod,
  onPeriodChange
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0 pb-2">
        <CardTitle>Campaign Performance</CardTitle>
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">This year</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-64 relative">
          <div className="flex items-end justify-between h-56 px-2">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="w-1/5 flex flex-col items-center group relative">
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white p-2 rounded text-xs transform -translate-x-1/2 left-1/2 whitespace-nowrap z-10">
                  {campaign.name}: {campaign.conversions} conversions
                </div>
                <div 
                  className="bg-primary-500 rounded-t w-12 transition-all duration-500 ease-in-out" 
                  style={{ height: `${campaign.percentage}%` }}
                ></div>
                <div className="mt-2 text-xs text-slate-600 font-medium text-center">{campaign.name}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-primary-500 mr-2"></div>
            <span className="text-xs text-slate-600">Campaign Performance</span>
          </div>
          <button className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center">
            <span>Detailed Report</span>
            <ArrowRight className="ml-1" size={16} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CampaignPerformance;
