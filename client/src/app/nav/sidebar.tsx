import { Link, useLocation } from "wouter";
import { useFlag } from "@/hooks/use-feature-flags";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Map,
  Target,
  Megaphone,
  Zap,
  Mail,
  FileText,
  Calendar,
  Database,
  BarChart3,
  Settings,
  Home
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  flagKey?: string;
  badge?: string;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

// Navigation configuration
const navigationConfig: NavGroup[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: Home,
      }
    ]
  },
  {
    title: "CRM",
    items: [
      {
        title: "Contacts",
        href: "/contacts",
        icon: Users,
        flagKey: "ff.contacts_unified"
      },
      {
        title: "Journeys",
        href: "/journeys",
        icon: Map,
        flagKey: "ff.journey_unified"
      },
      {
        title: "Segments",
        href: "/contacts/segments",
        icon: Target,
        flagKey: "ff.unified_segments"
      }
    ]
  },
  {
    title: "Marketing",
    items: [
      {
        title: "Campaigns",
        href: "/campaigns",
        icon: Megaphone,
      },
      {
        title: "Automation",
        href: "/automation/workflows",
        icon: Zap,
        flagKey: "ff.automation_unified"
      },
      {
        title: "Email",
        href: "/email",
        icon: Mail,
      },
      {
        title: "Forms",
        href: "/marketing-forms",
        icon: FileText,
      }
    ]
  },
  {
    title: "Operations",
    items: [
      {
        title: "Calendar",
        href: "/calendar",
        icon: Calendar,
      },
      {
        title: "Data",
        href: "/data",
        icon: Database,
      },
      {
        title: "Analytics",
        href: "/analytics",
        icon: BarChart3,
      }
    ]
  },
  {
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
      }
    ]
  }
];

function NavItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const flagEnabled = useFlag(item.flagKey || '');
  const showSoonBadge = item.flagKey && !flagEnabled;
  
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        "hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2",
        isActive 
          ? "bg-green-50 text-green-700 border-green-200" 
          : "text-gray-700 hover:text-gray-900"
      )}
      role="menuitem"
    >
      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-green-600" : "text-gray-500")} />
      <span className="truncate">{item.title}</span>
      {showSoonBadge && (
        <Badge variant="secondary" className="ml-auto text-xs">
          Soon
        </Badge>
      )}
    </Link>
  );
}

function NavGroup({ group }: { group: NavGroup }) {
  const [location] = useLocation();

  return (
    <div className="space-y-1">
      {group.title && (
        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {group.title}
        </h3>
      )}
      <nav role="menu" className="space-y-1">
        {group.items.map((item) => {
          // Check if current route matches this nav item
          const isActive = location === item.href || 
                          (item.href !== '/' && location.startsWith(item.href));
          
          return (
            <NavItem key={item.href} item={item} isActive={isActive} />
          );
        })}
      </nav>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">
          AI CRM
        </h1>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="px-3 space-y-6">
          {navigationConfig.map((group, index) => (
            <NavGroup key={index} group={group} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          © 2025 AI CRM
        </div>
      </div>
    </aside>
  );
}