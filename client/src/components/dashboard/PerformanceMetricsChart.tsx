import { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";

interface MetricsData {
  date: string;
  sales?: number;
  conversions?: number;
  leads?: number;
}

interface PerformanceMetricsChartProps {
  data: MetricsData[];
  title: string;
  description?: string;
  chartType?: 'area' | 'bar';
}

const PerformanceMetricsChart: FC<PerformanceMetricsChartProps> = ({
  data,
  title,
  description,
  chartType = 'area'
}) => {
  const formatValue = (value: number): string => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart
                data={data}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  tickFormatter={formatValue}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip 
                  formatter={(value: number) => [value, '']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ 
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                  }}
                />
                {data[0]?.sales !== undefined && (
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    name="Sales" 
                    stroke="#6366f1" 
                    fill="#6366f1" 
                    fillOpacity={0.2} 
                    activeDot={{ r: 6 }}
                  />
                )}
                {data[0]?.conversions !== undefined && (
                  <Area 
                    type="monotone" 
                    dataKey="conversions" 
                    name="Conversions" 
                    stroke="#22c55e" 
                    fill="#22c55e" 
                    fillOpacity={0.2} 
                    activeDot={{ r: 6 }}
                  />
                )}
                {data[0]?.leads !== undefined && (
                  <Area 
                    type="monotone" 
                    dataKey="leads" 
                    name="Leads" 
                    stroke="#f59e0b" 
                    fill="#f59e0b" 
                    fillOpacity={0.2} 
                    activeDot={{ r: 6 }}
                  />
                )}
                <Legend />
              </AreaChart>
            ) : (
              <BarChart
                data={data}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  tickFormatter={formatValue}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip 
                  formatter={(value: number) => [value, '']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ 
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                  }}
                />
                {data[0]?.sales !== undefined && (
                  <Bar 
                    dataKey="sales" 
                    name="Sales" 
                    fill="#6366f1" 
                    radius={[4, 4, 0, 0]}
                  />
                )}
                {data[0]?.conversions !== undefined && (
                  <Bar 
                    dataKey="conversions" 
                    name="Conversions" 
                    fill="#22c55e" 
                    radius={[4, 4, 0, 0]}
                  />
                )}
                {data[0]?.leads !== undefined && (
                  <Bar 
                    dataKey="leads" 
                    name="Leads" 
                    fill="#f59e0b" 
                    radius={[4, 4, 0, 0]}
                  />
                )}
                <Legend />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceMetricsChart;