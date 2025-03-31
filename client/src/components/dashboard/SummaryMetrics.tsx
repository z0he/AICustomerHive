import { FC } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Megaphone, TrendingUp } from "lucide-react";

interface Metric {
  title: string;
  value: string;
  change: {
    value: string;
    type: "increase" | "decrease";
    label: string;
  };
  icon: "users" | "campaigns" | "conversion";
}

interface SummaryMetricsProps {
  metrics: Metric[];
}

const SummaryMetrics: FC<SummaryMetricsProps> = ({ metrics }) => {
  const getIcon = (iconType: string) => {
    switch (iconType) {
      case "users":
        return <Users className="text-primary-600" size={20} />;
      case "campaigns":
        return <Megaphone className="text-secondary-600" size={20} />;
      case "conversion":
        return <TrendingUp className="text-green-600" size={20} />;
      default:
        return null;
    }
  };
  
  const getIconBgColor = (iconType: string) => {
    switch (iconType) {
      case "users":
        return "bg-primary-100";
      case "campaigns":
        return "bg-secondary-100";
      case "conversion":
        return "bg-green-100";
      default:
        return "bg-slate-100";
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{metric.title}</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{metric.value}</h3>
              </div>
              <div className={`h-10 w-10 rounded-full ${getIconBgColor(metric.icon)} flex items-center justify-center`}>
                {getIcon(metric.icon)}
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs">
              <span className={`${metric.change.type === 'increase' ? 'text-green-500' : 'text-red-500'} font-medium flex items-center`}>
                {metric.change.type === 'increase' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 7a1 1 0 01-1 1H9v2a1 1 0 01-2 0V8H5a1 1 0 010-2h2V4a1 1 0 112 0v2h2a1 1 0 011 1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                {metric.change.value}
              </span>
              <span className="text-slate-500 ml-2">{metric.change.label}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SummaryMetrics;
