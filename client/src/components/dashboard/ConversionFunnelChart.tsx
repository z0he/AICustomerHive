import { FC } from "react";
import { 
  ResponsiveContainer, 
  FunnelChart, 
  Funnel, 
  LabelList, 
  Tooltip,
  Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FunnelData {
  name: string;
  value: number;
}

interface ConversionFunnelChartProps {
  data: FunnelData[];
  title: string;
  description?: string;
}

const ConversionFunnelChart: FC<ConversionFunnelChartProps> = ({ 
  data, 
  title, 
  description 
}) => {
  // Color gradient for the funnel
  const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip 
                formatter={(value: number) => [`${value} contacts`, 'Count']}
                contentStyle={{ 
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                }}
              />
              <Funnel
                dataKey="value"
                data={data}
                isAnimationActive
              >
                <LabelList 
                  position="right"
                  fill="#374151"
                  stroke="none"
                  dataKey="name"
                  fontSize={12}
                />
                <LabelList
                  position="center"
                  fill="#ffffff"
                  stroke="none"
                  dataKey="value"
                  fontSize={11}
                  fontWeight="bold"
                />
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConversionFunnelChart;