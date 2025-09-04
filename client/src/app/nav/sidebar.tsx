import { Link, useLocation } from "wouter";
import { useFlag } from "@/hooks/use-feature-flags";
import {
  Users, Route as RouteIcon, Filter, Megaphone, Workflow, Mail, FormInput,
  Calendar, Database, BarChart3, Settings, Home
} from "lucide-react";
import clsx from "clsx";
import React from "react";

type NavItem = { 
  label: string; 
  href: string; 
  icon: React.ReactNode; 
  flag?: string;
  description?: string;
};

const items: NavItem[] = [
  { 
    label: "Dashboard", 
    href: "/dashboard", 
    icon: <Home className="w-4 h-4" />,
    description: "Overview and metrics"
  },
  { 
    label: "Contacts", 
    href: "/contacts", 
    icon: <Users className="w-4 h-4" />,
    description: "Manage leads and customers"
  },
  { 
    label: "Journeys", 
    href: "/journeys", 
    icon: <RouteIcon className="w-4 h-4" />, 
    flag: "ff.journey_unified",
    description: "Customer journey mapping"
  },
  { 
    label: "Segments", 
    href: "/contacts/segments", 
    icon: <Filter className="w-4 h-4" />, 
    flag: "ff.unified_segments",
    description: "Contact segmentation"
  },
  { 
    label: "Campaigns", 
    href: "/campaigns", 
    icon: <Megaphone className="w-4 h-4" />,
    description: "Marketing campaigns"
  },
  { 
    label: "Automation", 
    href: "/automation/workflows", 
    icon: <Workflow className="w-4 h-4" />, 
    flag: "ff.automation_unified",
    description: "Workflow automation"
  },
  { 
    label: "Email", 
    href: "/email", 
    icon: <Mail className="w-4 h-4" />,
    description: "Email management"
  },
  { 
    label: "Forms", 
    href: "/marketing-forms", 
    icon: <FormInput className="w-4 h-4" />,
    description: "Lead capture forms"
  },
  { 
    label: "Calendar", 
    href: "/calendar", 
    icon: <Calendar className="w-4 h-4" />,
    description: "Event scheduling"
  },
  { 
    label: "Data", 
    href: "/data", 
    icon: <Database className="w-4 h-4" />,
    description: "Export and quality"
  },
  { 
    label: "Analytics", 
    href: "/analytics", 
    icon: <BarChart3 className="w-4 h-4" />,
    description: "Reports and insights"
  },
  { 
    label: "Settings", 
    href: "/settings", 
    icon: <Settings className="w-4 h-4" />,
    description: "Configuration and preferences"
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  
  return (
    <aside className="w-60 border-r bg-white/80 backdrop-blur-sm min-h-screen">
      <div className="p-4 border-b">
        <div className="text-lg font-bold text-gray-900">AICRM</div>
        <div className="text-xs text-gray-500">Customer Relationship Management</div>
      </div>
      
      <nav className="p-3 space-y-1">
        {items.map((item) => (
          <NavItem 
            key={item.href} 
            href={item.href} 
            active={isActiveRoute(location, item.href)} 
            flag={item.flag}
            icon={item.icon}
            label={item.label}
            description={item.description}
          />
        ))}
      </nav>
    </aside>
  );
}

function NavItem({ 
  href, 
  icon, 
  label, 
  description, 
  active, 
  flag 
}: { 
  href: string; 
  icon: React.ReactNode; 
  label: string; 
  description?: string;
  active: boolean; 
  flag?: string;
}) {
  const isEnabled = flag ? useFlag(flag) : true;
  
  return (
    <Link 
      href={href} 
      className={clsx(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        "hover:bg-gray-100",
        active 
          ? "bg-green-100 text-green-800 font-medium" 
          : "text-gray-700"
      )}
    >
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{label}</div>
        {description && (
          <div className="text-xs text-gray-500 truncate">{description}</div>
        )}
      </div>
      {!isEnabled && (
        <span className="text-[10px] rounded-full bg-gray-100 px-2 py-0.5 text-gray-500 font-medium">
          Soon
        </span>
      )}
    </Link>
  );
}

/**
 * Determine if a route is active based on current location
 */
function isActiveRoute(location: string, href: string): boolean {
  // Exact match for home/dashboard
  if (href === "/dashboard" && location === "/") return true;
  if (href === location) return true;
  
  // For other routes, check if location starts with href
  // but avoid false positives (e.g., /contacts shouldn't match /contacts/segments)
  if (href !== "/" && location.startsWith(href)) {
    const remainingPath = location.slice(href.length);
    return remainingPath === "" || remainingPath.startsWith("/") || remainingPath.startsWith("?");
  }
  
  return false;
}