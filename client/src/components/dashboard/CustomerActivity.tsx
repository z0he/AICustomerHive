import { FC } from "react";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Activity {
  id: number;
  customer: {
    id: number;
    name: string;
    email: string;
    initials: string;
  };
  action: string;
  campaign: string;
  date: string;
  status: "active" | "inactive";
}

interface CustomerActivityProps {
  recentActivity: Activity[];
}

const CustomerActivity: FC<CustomerActivityProps> = ({ recentActivity }) => {
  return (
    <Card>
      <CardHeader className="flex justify-between items-center pb-2">
        <CardTitle>Recent Customer Activity</CardTitle>
        <button className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center">
          <span>View All</span>
          <ArrowRight className="ml-1" size={16} />
        </button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Activity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Campaign</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {recentActivity.map((activity) => (
                <tr key={activity.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-slate-200 text-slate-700">
                          {activity.customer.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-slate-800">{activity.customer.name}</p>
                        <p className="text-xs text-slate-500">{activity.customer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-slate-700">{activity.action}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-slate-700">{activity.campaign}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-slate-500">{activity.date}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={activity.status === "active" ? "success" : "destructive"}>
                      {activity.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerActivity;
