import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Users, Map, Filter, Megaphone, Zap, Mail, FileText,
  Calendar as CalIcon, Database, BarChart3, Settings, Coins
} from 'lucide-react';
import { useFlag } from '@/hooks/use-feature-flags';
import { useCredits } from '@/hooks/use-credits';
import { Button } from '@/components/ui/button';
import { TopUpCreditsModal } from '@/components/TopUpCreditsModal';
import LogoutButton from '@/components/auth/LogoutButton';

type NavItem = { label: string; href: string; icon?: any; children?: NavItem[]; flagKey?: string };

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'General',
    items: [{ icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' }],
  },
  {
    label: 'CRM',
    items: [
      { 
        icon: Users, 
        label: 'Contacts', 
        href: '/contacts'
      },
      { icon: Map, label: 'Contact Journey Mapping', href: '/journeys' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { icon: Megaphone, label: 'Campaigns', href: '/campaigns' },
      { icon: Zap, label: 'Automation', href: '/automation' },
      { icon: Mail, label: 'Email', href: '/email' },
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
  
  // Special handling for query-based routes like /contacts?stage=...
  if (href.includes('?')) {
    const [path, query] = href.split('?');
    if (current.startsWith(path)) {
      // For contacts children, check if the current URL matches the query
      if (path === '/contacts' && current === path) {
        // Parent contacts is active if we're on any contacts page
        return true;
      }
      if (current.includes(query)) {
        return true;
      }
    }
    return false;
  }
  
  return current === href || current.startsWith(href + '/');
}

export function Sidebar() {
  const [loc] = useLocation();
  const { data: credits, isLoading: creditsLoading } = useCredits();
  const [showTopUpModal, setShowTopUpModal] = useState(false);

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
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col">
      <div className="h-14 flex items-center px-4 font-semibold text-emerald-700">
        AICRM
      </div>
      <nav className="py-2 flex-1 overflow-y-auto">
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
      
      {/* Credit Balance Display */}
      <div className="border-t border-slate-200 p-4" data-testid="credit-balance-section">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Coins size={16} className={credits?.lowBalance ? 'text-amber-600' : 'text-amber-500'} />
            <span className="font-medium">Credits</span>
          </div>
          {!creditsLoading && credits && (
            <span 
              className={`text-lg font-bold ${
                credits.lowBalance ? 'text-red-600' : 'text-emerald-600'
              }`}
              data-testid="credit-balance-amount"
            >
              {credits.balance.toLocaleString()}
            </span>
          )}
          {creditsLoading && (
            <span className="text-sm text-slate-400">Loading...</span>
          )}
        </div>
        <Button 
          size="sm" 
          variant={credits?.lowBalance ? 'default' : 'outline'}
          className={`w-full text-xs ${credits?.lowBalance ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
          onClick={() => setShowTopUpModal(true)}
          data-testid="button-topup-credits"
        >
          Top Up Credits
        </Button>
        <LogoutButton 
          variant="outline" 
          className="w-full mt-2 text-xs" 
          showIcon={true}
        />
      </div>
      
      <TopUpCreditsModal
        open={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        current={credits?.balance}
      />
    </aside>
  );
}