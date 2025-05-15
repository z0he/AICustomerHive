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
    <header className="bg-white border-b border-brand-blue/10 py-3 px-6 flex justify-between items-center shadow-sm">
      <div className="flex items-center">
        <div className="flex items-center">
          <AIcrmLogo width={120} height={45} />
        </div>
        <div className="ml-10 hidden md:flex items-center space-x-7">
          <Link href="/dashboard" className="text-slate-600 hover:text-brand-blue font-medium text-sm uppercase tracking-wide">Dashboard</Link>
          <Link href="/customers" className="text-slate-600 hover:text-brand-blue font-medium text-sm uppercase tracking-wide">Customers</Link>
          <Link href="/campaigns" className="text-slate-600 hover:text-brand-blue font-medium text-sm uppercase tracking-wide">Campaigns</Link>
          <Link href="/analytics" className="text-slate-600 hover:text-brand-blue font-medium text-sm uppercase tracking-wide">Analytics</Link>
          <Link href="/settings" className="text-slate-600 hover:text-brand-blue font-medium text-sm uppercase tracking-wide">Settings</Link>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="relative cursor-pointer">
            <Bell className="text-brand-blue" size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-green text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-0 shadow-md rounded-lg border-brand-blue/10">
            <DropdownMenuLabel className="bg-brand-gradient text-white font-bold uppercase text-sm tracking-wide py-3">Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length > 0 ? (
              notifications.map(notification => (
                <DropdownMenuItem key={notification.id} className={`${!notification.read ? 'font-semibold bg-brand-green/10' : ''}`}>
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
              <span className="text-brand-blue hover:text-brand-green">View all</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center space-x-2 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-white font-medium">
              {user.initials}
            </div>
            <span className="text-sm font-medium hidden md:inline-block uppercase tracking-wide">{user.name}</span>
            <ChevronDown className="text-brand-blue" size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="p-0 shadow-md rounded-lg border-brand-blue/10">
            <DropdownMenuLabel className="bg-brand-gradient text-white font-bold uppercase text-sm tracking-wide py-3">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="hover:text-brand-blue">Profile</DropdownMenuItem>
            <DropdownMenuItem className="hover:text-brand-blue">Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <LogoutButton variant="ghost" className="w-full justify-start p-2 cursor-pointer hover:text-brand-blue" showIcon={true} />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AuthHeader;
