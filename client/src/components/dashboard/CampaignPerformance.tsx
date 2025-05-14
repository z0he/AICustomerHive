import { FC, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: number;
  name: string;
  conversions: number;
  percentage: number;
  type?: string;
  message?: string;
  targetAudience?: string;
  startDate?: string;
  endDate?: string;
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
  const { toast } = useToast();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  
  const handleCampaignClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    toast({
      title: `Campaign: ${campaign.name}`,
      description: `${campaign.conversions} conversions (${campaign.percentage}% of target)`
    });
  };
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
          {campaigns.length > 0 ? (
            <div className="grid grid-cols-5 h-56 gap-4 mb-2">
              {campaigns.map((campaign) => (
                <div 
                  key={campaign.id} 
                  className="flex flex-col items-center justify-end group relative h-full"
                >
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white p-2 rounded text-xs transform -translate-x-1/2 left-1/2 whitespace-nowrap z-10">
                    {campaign.name}: {campaign.conversions} conversions
                  </div>
                  <div 
                    className="bg-blue-500 rounded-t w-16 transition-all duration-300 cursor-pointer hover:bg-blue-600 shadow-sm" 
                    style={{ 
                      height: `${Math.max(campaign.percentage, 10)}%`
                    }}
                    onClick={() => handleCampaignClick(campaign)}
                  ></div>
                  <div 
                    className="mt-2 text-xs text-slate-600 font-medium text-center truncate w-full cursor-pointer"
                    onClick={() => handleCampaignClick(campaign)}
                  >
                    {campaign.name}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-56 flex items-center justify-center text-slate-500">
              No campaign data available for this period
            </div>
          )}
        </div>
        {selectedCampaign && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium">{selectedCampaign.name} Details</h4>
              <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                selectedCampaign.percentage > 50 
                  ? "border-transparent bg-green-500 text-white" 
                  : "border-transparent bg-primary text-primary-foreground"
              }`}>
                {selectedCampaign.percentage}% Performance
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Type:</span> {selectedCampaign.type || 'N/A'}
              </div>
              <div>
                <span className="text-slate-500">Audience:</span> {selectedCampaign.targetAudience || 'All'}
              </div>
              <div>
                <span className="text-slate-500">Start:</span> {selectedCampaign.startDate || 'N/A'}
              </div>
              <div>
                <span className="text-slate-500">End:</span> {selectedCampaign.endDate || 'N/A'}
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Message:</span> {selectedCampaign.message || 'No message content'}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span className="text-xs text-slate-600">Campaign Performance</span>
          </div>
          <button 
            className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center"
            onClick={() => toast({ 
              title: "Detailed Reports", 
              description: selectedCampaign 
                ? `Detailed analytics for ${selectedCampaign.name} will be available in a future update.`
                : "Select a campaign to view detailed analytics."
            })}
          >
            <span>Detailed Report</span>
            <ArrowRight className="ml-1" size={16} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CampaignPerformance;
