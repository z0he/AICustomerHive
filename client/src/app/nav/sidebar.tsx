import { Link, useLocation } from "wouter";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Users,
  Map,
  Filter,
  Megaphone,
  Zap,
  Mail,
  FileText,
  Calendar,
  Database,
  BarChart3,
  Settings,
  LayoutDashboard
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<any>;
  children?: NavItem[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_CONFIG: NavGroup[] = [
  {
    label: 'CRM',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
      { icon: Users, label: 'Contacts', href: '/contacts' },
      { icon: Map, label: 'Journeys', href: '/customer-journey' },
      { icon: Filter, label: 'Segments', href: '/unified-segments' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { icon: Megaphone, label: 'Campaigns', href: '/campaigns' },
      {
        icon: Zap,
        label: 'Automation',
        href: '/automation/workflows',
        children: [
          { label: 'Workflows', href: '/automation/workflows' },
          { label: 'Templates', href: '/automation/templates' },
          { label: 'Execution Logs', href: '/automation/logs' },
          { label: 'Analytics', href: '/automation/analytics' },
        ],
      },
      {
        icon: Mail,
        label: 'Email',
        href: '/email-management',
        children: [
          { label: 'Templates', href: '/email-management' },
          { label: 'Campaigns', href: '/email-management' },
          { label: 'Sequences', href: '/email-management' },
          { label: 'Deliverability', href: '/email-delivery' },
        ],
      },
      { icon: FileText, label: 'Forms', href: '/marketing-forms' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: Calendar, label: 'Calendar', href: '/calendar' },
      {
        icon: Database,
        label: 'Data',
        href: '/customer-data',
        children: [
          { label: 'Export', href: '/customer-data' },
          { label: 'Import', href: '/customer-data' },
          { label: 'Data Quality', href: '/data/quality' },
        ],
      },
      { icon: BarChart3, label: 'Analytics', href: '/analytics' },
      { icon: Settings, label: 'Settings', href: '/settings' },
    ],
  },
];

function Group({ label }: { label: string }) {
  return (
    <div className="px-4 pt-6 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
      {label}
    </div>
  );
}

function NavItem({ item }: { item: NavItem }) {
  const [location] = useLocation();
  const [isExpanded, setIsExpanded] = useState(() => {
    // Auto-expand if current route matches any child
    if (item.children) {
      return item.children.some(child => location.startsWith(child.href)) || location.startsWith(item.href);
    }
    return false;
  });

  const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
  const hasChildren = item.children && item.children.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  const BaseLink = (
    <Link href={item.href}>
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-sm transition-colors cursor-pointer",
          "hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
          isActive
            ? "text-emerald-700 font-medium border-l-2 border-emerald-600 bg-emerald-50"
            : "text-slate-700"
        )}
        onClick={handleToggle}
      >
        {item.icon && <item.icon size={16} className="shrink-0" />}
        <span className="flex-1">{item.label}</span>
        {hasChildren && (
          <span className="ml-auto">
            {isExpanded ? (
              <ChevronDown size={14} className="text-slate-400" />
            ) : (
              <ChevronRight size={14} className="text-slate-400" />
            )}
          </span>
        )}
      </div>
    </Link>
  );

  return (
    <li>
      {BaseLink}
      {hasChildren && isExpanded && item.children && (
        <ul className="ml-2 mt-1 border-l border-slate-200">
          {item.children.map((child) => {
            const childIsActive = location === child.href || location.startsWith(child.href);
            return (
              <li key={child.href}>
                <Link href={child.href}>
                  <div
                    className={cn(
                      "block py-1.5 pl-6 pr-3 text-[13px] transition-colors cursor-pointer",
                      "hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                      childIsActive
                        ? "text-emerald-700 font-medium"
                        : "text-slate-600"
                    )}
                  >
                    {child.label}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-slate-200 bg-white h-full flex flex-col">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-slate-200">
        <div className="font-semibold text-slate-900">AICRM</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_CONFIG.map((group) => (
          <div key={group.label}>
            <Group label={group.label} />
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        <div className="text-xs text-slate-500">© 2025 AI CRM</div>
      </div>
    </aside>
  );
}