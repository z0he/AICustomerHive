import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Users, Map, Filter, Megaphone, Zap, Mail, FileText,
  Calendar as CalIcon, Database, BarChart3, Settings
} from 'lucide-react';
import { useFlag } from '@/hooks/use-feature-flags';

type NavItem = { label: string; href: string; icon?: any; children?: NavItem[]; flagKey?: string };

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'General',
    items: [{ icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' }],
  },
  {
    label: 'CRM',
    items: [
      { icon: Users, label: 'Contacts', href: '/contacts', flagKey: 'ff.contacts_unified' },
      { icon: Map, label: 'Journeys', href: '/journeys', flagKey: 'ff.journey_unified' },
      { icon: Filter, label: 'Segments', href: '/segments', flagKey: 'ff.unified_segments' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { icon: Megaphone, label: 'Campaigns', href: '/campaigns' },
      { icon: Zap, label: 'Automation', href: '/automation', flagKey: 'ff.automation_unified' },
      {
        icon: Mail, label: 'Email', href: '/email',
        children: [
          { label: 'Deliverability', href: '/email-delivery' },
        ],
      },
      { icon: FileText, label: 'Forms', href: '/marketing-forms' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: CalIcon, label: 'Calendar', href: '/calendar' },
      {
        icon: Database, label: 'Data', href: '/customer-data',
        children: [
          { label: 'Export / Import', href: '/customer-data' },
          { label: 'Data Quality', href: '/data/quality' },
        ],
      },
      { icon: BarChart3, label: 'Analytics', href: '/analytics' },
      { icon: Settings, label: 'Settings', href: '/settings' },
    ],
  },
];

function isActive(current: string, href: string) {
  if (href === '/dashboard') return current === '/dashboard';
  return current === href || current.startsWith(href + '/');
}

export function Sidebar() {
  const [loc] = useLocation();

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const flagEnabled = item.flagKey ? useFlag(item.flagKey) : true;
    
    return (
      <>
        <Link
          href={item.href}
          className={[
            'flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50',
            isActive(loc, item.href)
              ? 'text-emerald-700 font-medium border-l-2 border-emerald-600 bg-emerald-50'
              : 'text-slate-700',
          ].join(' ')}
        >
          {item.icon ? <item.icon size={16} /> : null}
          <span>{item.label}</span>
          {item.flagKey && !flagEnabled && (
            <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
              Soon
            </span>
          )}
        </Link>
        {item.children?.length ? (
          <ul className="ml-2 mt-1 border-l border-slate-200">
            {item.children.map((c) => (
              <li key={c.href}>
                <Link
                  href={c.href}
                  className={[
                    'block py-1.5 pl-6 pr-3 text-[13px] hover:bg-slate-50',
                    isActive(loc, c.href)
                      ? 'text-emerald-700 font-medium'
                      : 'text-slate-600',
                  ].join(' ')}
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </>
    );
  };

  return (
    <aside className="w-64 border-r border-slate-200 bg-white">
      <div className="h-14 flex items-center px-4 font-semibold text-emerald-700">
        AICRM
      </div>
      <nav className="py-2">
        {NAV.map((sec) => (
          <div key={sec.label}>
            <div className="px-4 pt-6 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {sec.label}
            </div>
            <ul className="space-y-0.5">
              {sec.items.map((item) => (
                <li key={item.href}>
                  <NavItemComponent item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}