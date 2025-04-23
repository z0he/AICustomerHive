import { FC } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LabelList
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Campaign } from "@shared/schema";

interface CampaignPerformanceChartProps {
  campaigns: Campaign[];
  onCampaignSelect: (campaign: Campaign) => void;
  selectedCampaignId?: number;
}

const CampaignPerformanceChart: FC<CampaignPerformanceChartProps> = ({
  campaigns,
  onCampaignSelect,
  selectedCampaignId
}) => {
  // Transform data for the chart
  const chartData = campaigns.map(campaign => ({
    name: campaign.name,
    conversions: campaign.conversions,
    percentage: campaign.percentage,
    id: campaign.id
  }));
  
  // Custom tooltip for the bar chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const campaign = campaigns.find(c => c.id === payload[0].payload.id);
      if (!campaign) return null;
      
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-md shadow-sm text-xs">
          <p className="font-medium mb-1">{campaign.name}</p>
          <p className="text-slate-600">Type: {campaign.type || 'N/A'}</p>
          <p className="text-slate-600">Audience: {campaign.targetAudience || 'All'}</p>
          <p className="text-slate-600">Conversions: {campaign.conversions}</p>
          <p className="text-slate-600">Performance: {campaign.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Campaign Performance</CardTitle>
        <p className="text-sm text-muted-foreground">
          Conversion rates across active campaigns
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
              barSize={20}
              onClick={(data) => {
                if (data && data.activePayload && data.activePayload.length > 0) {
                  const clickedId = data.activePayload[0].payload.id;
                  const campaign = campaigns.find(c => c.id === clickedId);
                  if (campaign) {
                    onCampaignSelect(campaign);
                  }
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis 
                type="number" 
                domain={[0, 100]} 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 12 }} 
                width={150}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="percentage" name="Performance %" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.id === selectedCampaignId ? '#6366f1' : '#93c5fd'} 
                    cursor="pointer"
                  />
                ))}
                <LabelList dataKey="percentage" position="right" formatter={(value: number) => `${value}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default CampaignPerformanceChart;