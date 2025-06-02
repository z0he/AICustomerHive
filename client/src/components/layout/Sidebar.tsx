import { FC } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  Users, 
  Megaphone, 
  BarChart2, 
  Settings,
  Tag,
  UserPlus,
  FileDown,
  CalendarDays,
  Send,
  Mail,
  FormInput,
  Bell,
  ShieldAlert,
  Code,
  LineChart
} from "lucide-react";

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

interface RecentCampaign {
  id: number;
  name: string;
  path: string;
}

interface SidebarProps {
  activeItem?: string;
  recentCampaigns?: RecentCampaign[];
}

const Sidebar: FC<SidebarProps> = ({ recentCampaigns = [] }) => {
  const [location] = useLocation();
  
  // Get current user to check admin status
  const { data: userResponse, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    refetchOnWindowFocus: false
  });
  
  const isAdmin = userResponse?.user?.isAdmin === true;
  
  const mainNavItems: SidebarItem[] = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: "/dashboard" },
    { icon: <Users size={20} />, label: "Customers", path: "/customers" },
    { icon: <UserPlus size={20} />, label: "Leads", path: "/leads" },
    { icon: <Megaphone size={20} />, label: "Campaigns", path: "/campaigns" },
    { icon: <Send size={20} />, label: "Email", path: "/email" },
    { icon: <Mail size={20} />, label: "Email Status", path: "/email-delivery" },
    { icon: <FormInput size={20} />, label: "Forms", path: "/marketing-forms" },
    { icon: <CalendarDays size={20} />, label: "Calendar", path: "/calendar" },
    { icon: <FileDown size={20} />, label: "Data Mgmt", path: "/customer-data" },
    { icon: <BarChart2 size={20} />, label: "Analytics", path: "/analytics" },
  ];

  return (
    <aside className="w-16 md:w-64 bg-white border-r border-brand-blue/10 flex flex-col shadow-md">
      <div className="p-4 overflow-y-auto flex-1">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <div key={item.path}>
              <Link href={item.path}>
                <div className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer ${
                  location === item.path 
                    ? 'bg-brand-gradient text-white font-medium' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-brand-blue'
                }`}>
                  {item.icon}
                  <span className="font-medium text-sm hidden md:inline-block uppercase tracking-wide">{item.label}</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
        
        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold text-brand-green uppercase tracking-wider hidden md:block letter-spacing-1">
            Recent Campaigns
          </h3>
          <div className="mt-2 space-y-1">
            {recentCampaigns.map((campaign) => (
              <div key={campaign.id}>
                <Link href={campaign.path}>
                  <div className="flex items-center space-x-3 text-slate-600 hover:bg-slate-50 hover:text-brand-blue px-3 py-2 rounded-lg cursor-pointer">
                    <Tag size={18} className="text-brand-blue" />
                    <span className="text-sm hidden md:inline-block truncate">{campaign.name}</span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-slate-200">
        <div className="space-y-1">
          {isAdmin && (
            <Link href="/admin/notifications">
              <div className="flex items-center space-x-3 text-slate-600 hover:bg-slate-50 hover:text-brand-blue px-3 py-2 rounded-lg cursor-pointer">
                <Bell size={20} className="text-amber-600" />
                <span className="font-medium text-sm hidden md:inline-block uppercase tracking-wide">Notifications</span>
              </div>
            </Link>
          )}
          <Link href="/settings">
            <div className="flex items-center space-x-3 text-slate-600 hover:bg-slate-50 hover:text-brand-blue px-3 py-2 rounded-lg cursor-pointer">
              <Settings size={20} className="text-brand-blue" />
              <span className="font-medium text-sm hidden md:inline-block uppercase tracking-wide">Settings</span>
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
