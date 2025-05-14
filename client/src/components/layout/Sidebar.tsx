import { FC } from "react";
import { Link, useLocation } from "wouter";
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
  FormInput
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
  
  const mainNavItems: SidebarItem[] = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: "/dashboard" },
    { icon: <Users size={20} />, label: "Customers", path: "/customers" },
    { icon: <UserPlus size={20} />, label: "Leads", path: "/leads" },
    { icon: <Megaphone size={20} />, label: "Campaigns", path: "/campaigns" },
    { icon: <Send size={20} />, label: "Email", path: "/email" },
    { icon: <FormInput size={20} />, label: "Forms", path: "/marketing-forms" },
    { icon: <CalendarDays size={20} />, label: "Calendar", path: "/calendar" },
    { icon: <FileDown size={20} />, label: "Data Mgmt", path: "/customer-data" },
    { icon: <BarChart2 size={20} />, label: "Analytics", path: "/analytics" },
  ];

  return (
    <aside className="w-16 md:w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-4 overflow-y-auto flex-1">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <div key={item.path}>
              <Link href={item.path}>
                <div className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer ${
                  location === item.path ? 'text-[#0082AE] bg-[#0082AE]/10' : 'text-slate-600 hover:bg-slate-50 hover:text-[#0082AE]'
                }`}>
                  {item.icon}
                  <span className="font-medium text-sm hidden md:inline-block">{item.label}</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
        
        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:block">
            Recent Campaigns
          </h3>
          <div className="mt-2 space-y-1">
            {recentCampaigns.map((campaign) => (
              <div key={campaign.id}>
                <Link href={campaign.path}>
                  <div className="flex items-center space-x-3 text-slate-600 hover:bg-slate-50 hover:text-[#0082AE] px-3 py-2 rounded-lg cursor-pointer">
                    <Tag size={18} />
                    <span className="text-sm hidden md:inline-block truncate">{campaign.name}</span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-slate-200">
        <div>
          <Link href="/settings">
            <div className="flex items-center space-x-3 text-slate-600 hover:bg-slate-50 hover:text-[#0082AE] px-3 py-2 rounded-lg cursor-pointer">
              <Settings size={20} />
              <span className="font-medium text-sm hidden md:inline-block">Settings</span>
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
