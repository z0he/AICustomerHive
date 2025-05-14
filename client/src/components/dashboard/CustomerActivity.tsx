import { FC } from "react";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
        <CardTitle className="text-brand-blue uppercase tracking-wide">Recent Customer Activity</CardTitle>
        <button className="text-brand-blue text-sm font-medium hover:text-brand-green flex items-center">
          <span>View All</span>
          <ArrowRight className="ml-1" size={16} />
        </button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentActivity.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell>
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
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-700">{activity.action}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-700">{activity.campaign}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-500">{activity.date}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={activity.status === "active" ? "success" : "destructive"}>
                    {activity.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CustomerActivity;
