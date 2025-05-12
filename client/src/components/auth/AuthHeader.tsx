import { FC } from "react";
import { Link } from "wouter";
import { 
  Bell,
  ChevronDown
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import LogoutButton from "@/components/auth/LogoutButton";
import AIcrmLogo from "@/components/logo/AIcrmLogo";
import { BrandBadge } from "@/components/ui/brand-badge";

interface User {
  id: number;
  name: string;
  initials: string;
}

interface Notification {
  id: number;
  message: string;
  date: string;
  read: boolean;
}

interface AuthHeaderProps {
  user?: User;
  notifications?: Notification[];
  onLogout?: () => void;
}

const AuthHeader: FC<AuthHeaderProps> = ({ 
  user = { id: 1, name: "User", initials: "U" },
  notifications = [],
  onLogout = () => {} 
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <header className="bg-white border-b border-slate-200 py-2 px-4 flex justify-between items-center">
      <div className="flex items-center">
        <div className="flex items-center">
          <AIcrmLogo width={32} height={32} />
        </div>
        <div className="ml-8 hidden md:flex items-center space-x-4">
          <Link href="/dashboard" className="text-slate-600 hover:text-[#0082AE] font-medium text-sm">Dashboard</Link>
          <Link href="/customers" className="text-slate-600 hover:text-[#0082AE] font-medium text-sm">Customers</Link>
          <Link href="/campaigns" className="text-slate-600 hover:text-[#0082AE] font-medium text-sm">Campaigns</Link>
          <Link href="/analytics" className="text-slate-600 hover:text-[#0082AE] font-medium text-sm">Analytics</Link>
          <Link href="/settings" className="text-slate-600 hover:text-[#0082AE] font-medium text-sm">Settings</Link>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="relative cursor-pointer">
            <Bell className="text-slate-600" size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#8AC33E] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length > 0 ? (
              notifications.map(notification => (
                <DropdownMenuItem key={notification.id} className={`${!notification.read ? 'font-semibold' : ''}`}>
                  <div className="flex flex-col w-full">
                    <span>{notification.message}</span>
                    <span className="text-xs text-slate-500">{notification.date}</span>
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center">
              <span className="text-[#0082AE]">View all</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center space-x-2 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-[#0082AE]/10 flex items-center justify-center text-[#0082AE] font-medium">
              {user.initials}
            </div>
            <span className="text-sm font-medium hidden md:inline-block">{user.name}</span>
            <ChevronDown className="text-slate-400" size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <LogoutButton variant="ghost" className="w-full justify-start p-2 cursor-pointer" showIcon={true} />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AuthHeader;
