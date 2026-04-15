import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  Home,
  Star,
  Clock,
  FolderOpen,
  User,
  Handshake,
  Plus,
  CalendarDays,
  MessageSquare,
  UserCircle,
  BookOpen,
  Lightbulb,
  Shield,
  ChevronRight,
  CreditCard,
  Search,
  Bell,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarTreeNavProps {
  collapsed?: boolean;
}

export default function SidebarTreeNav({ collapsed }: SidebarTreeNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, isAdmin } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { translations } = useLanguage();
  const t = translations.app?.sidebar;

  const hiddenNav = Array.isArray(profile?.nav_hidden_pages)
    ? (profile.nav_hidden_pages as string[])
    : [];

  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = useCallback((key: string) => {
    setExpanded(prev => (prev === key ? null : key));
  }, []);

  // Auto-expand based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/personal-info' || path === '/account-settings') {
      setExpanded('account');
    } else if (path === '/service-plan' || path === '/billing-history') {
      setExpanded('billing');
    }
  }, [location.pathname]);

  const currentView = searchParams.get('view') || '';
  const isDashboard = location.pathname === '/dashboard';

  const isViewActive = (view: string) => {
    if (view === 'home') return isDashboard && !currentView;
    return isDashboard && currentView === view;
  };

  const isPathActive = (href: string) => {
    if (href === '/dashboard') return isDashboard && !currentView;
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  // Navigation items
  const accountExpanded = expanded === 'account';

  const projectNavItems = [
    { name: '🏠 ' + (t?.home || 'Home'), href: '/dashboard', view: 'home', icon: Home },
    { name: '⭐ Starred', href: '/dashboard?view=starred', view: 'starred', icon: Star },
    { name: '🕑 Recent', href: '/dashboard?view=recent', view: 'recent', icon: Clock },
  ];

  const projectFilterItems = [
    { name: '📂 ' + (t?.allProjects || 'All Projects'), href: '/dashboard?view=all', view: 'all', icon: FolderOpen },
    { name: '👤 Owned by Me', href: '/dashboard?view=owned', view: 'owned', icon: User },
    { name: '🤝 Shared with Me', href: '/dashboard?view=shared', view: 'shared', icon: Handshake },
  ];

  const personalItems = [
    { name: t?.calendar || 'Calendar', href: '/calendar', icon: CalendarDays },
    { name: t?.communication || 'Communication', href: '/communication', icon: MessageSquare },
    { name: t?.tips || 'Tips', href: '/tips', icon: BookOpen },
    { name: t?.feedback || 'Feedback', href: '/feedback', icon: Lightbulb },
  ].filter(i => !hiddenNav.includes(i.href));

  const accountChildren = [
    { name: t?.personalInfo || 'Personal Info', href: '/personal-info' },
    { name: t?.settings || 'Settings', href: '/account-settings' },
  ];

  const adminHref = '/admin';
  const isAdminActive = location.pathname.startsWith('/admin');

  /* ─── Collapsed mode ─── */
  if (collapsed) {
    return (
      <div className="tree-nav">
        <TreeItemCollapsed icon={Home} label={t?.home || 'Home'} href="/dashboard" active={isViewActive('home')} />
        <TreeItemCollapsed icon={Star} label="Starred" href="/dashboard?view=starred" active={isViewActive('starred')} />
        <TreeItemCollapsed icon={Clock} label="Recent" href="/dashboard?view=recent" active={isViewActive('recent')} />
        <div className="sidebar-nav-separator" />
        <TreeItemCollapsed icon={FolderOpen} label={t?.allProjects || 'All Projects'} href="/dashboard?view=all" active={isViewActive('all')} />
        <TreeItemCollapsed icon={User} label="Owned" href="/dashboard?view=owned" active={isViewActive('owned')} />
        <TreeItemCollapsed icon={Handshake} label="Shared" href="/dashboard?view=shared" active={isViewActive('shared')} />
        <div className="sidebar-nav-separator" />
        <TreeItemCollapsed icon={Search} label={t?.search || 'Search'} href="/search" active={isPathActive('/search')} />
        <TreeItemCollapsed icon={Bell} label={t?.notifications || 'Notifications'} href="/notifications" active={isPathActive('/notifications')} />
        <div className="sidebar-nav-separator" />
        {personalItems.map(item => (
          <TreeItemCollapsed key={item.href} icon={item.icon} label={item.name} href={item.href} active={isPathActive(item.href)} />
        ))}
        <TreeItemCollapsed icon={UserCircle} label={t?.account || 'Account'} href="/personal-info" active={isPathActive('/personal-info') || isPathActive('/account-settings')} />
        <TreeItemCollapsed icon={CreditCard} label={t?.servicePlan || 'Service Plan'} href="/service-plan" active={isPathActive('/service-plan') || isPathActive('/billing-history')} />
        {isAdmin && (
          <TreeItemCollapsed icon={Shield} label={t?.system || 'Admin'} href={adminHref} active={isAdminActive} />
        )}
      </div>
    );
  }

  /* ─── Expanded mode ─── */
  return (
    <div className="tree-nav">
      {/* ── Project navigation ── */}
      {projectNavItems.map(item => (
        <Link
          key={item.view}
          to={item.href}
          className={cn('sidebar-nav-item', isViewActive(item.view) && 'active')}
        >
          <item.icon className="nav-icon" strokeWidth={1.8} />
          <span className="nav-label">{item.name.replace(/^.\s/, '')}</span>
        </Link>
      ))}

      <div className="sidebar-nav-separator" />

      {projectFilterItems.map(item => (
        <Link
          key={item.view}
          to={item.href}
          className={cn('sidebar-nav-item', isViewActive(item.view) && 'active')}
        >
          <item.icon className="nav-icon" strokeWidth={1.8} />
          <span className="nav-label">{item.name.replace(/^.\s/, '')}</span>
        </Link>
      ))}

      {/* + New Project */}
      {activeWorkspace && (
        <Link
          to="/groups"
          className="sidebar-nav-item text-primary hover:bg-primary/5"
        >
          <Plus className="nav-icon" strokeWidth={2} />
          <span className="nav-label font-medium">{t?.newProject || 'New Project'}</span>
        </Link>
      )}

      <div className="sidebar-nav-separator" />

      {/* Search & Notifications */}
      <Link to="/search" className={cn('sidebar-nav-item', isPathActive('/search') && 'active')}>
        <Search className="nav-icon" strokeWidth={1.8} />
        <span className="nav-label">{t?.search || 'Search'}</span>
      </Link>
      <Link to="/notifications" className={cn('sidebar-nav-item', isPathActive('/notifications') && 'active')}>
        <Bell className="nav-icon" strokeWidth={1.8} />
        <span className="nav-label">{t?.notifications || 'Notifications'}</span>
      </Link>

      {/* ── Personal section ── */}
      <div className="sidebar-nav-separator" />
      <div className="sidebar-section-label">{t?.personal || 'PERSONAL'}</div>
      {personalItems.map(item => (
        <Link key={item.href} to={item.href} className={cn('sidebar-nav-item', isPathActive(item.href) && 'active')}>
          <item.icon className="nav-icon" strokeWidth={1.8} />
          <span className="nav-label">{item.name}</span>
        </Link>
      ))}

      {/* Account tree */}
      <button
        onClick={() => toggle('account')}
        className={cn(
          'sidebar-nav-item w-full text-left group',
          (isPathActive('/personal-info') || isPathActive('/account-settings')) && !accountExpanded && 'semi-active'
        )}
      >
        <ChevronRight className={cn('nav-chevron', accountExpanded && 'expanded')} />
        <UserCircle className="nav-icon" strokeWidth={1.8} />
        <span className="nav-label">{t?.account || 'Account'}</span>
      </button>

      {accountExpanded && (
        <div className="tree-children tree-level-1">
          {accountChildren.map(child => (
            <Link key={child.href} to={child.href} className={cn('sidebar-nav-item', isPathActive(child.href) && 'active')}>
              <span className="nav-label">{child.name}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Service Plan */}
      <button
        onClick={() => toggle('billing')}
        className={cn(
          'sidebar-nav-item w-full text-left group',
          (isPathActive('/service-plan') || isPathActive('/billing-history')) && expanded !== 'billing' && 'semi-active'
        )}
      >
        <ChevronRight className={cn('nav-chevron', expanded === 'billing' && 'expanded')} />
        <CreditCard className="nav-icon" strokeWidth={1.8} />
        <span className="nav-label">{t?.servicePlan || 'Service Plan'}</span>
      </button>

      {expanded === 'billing' && (
        <div className="tree-children tree-level-1">
          <Link to="/service-plan" className={cn('sidebar-nav-item', isPathActive('/service-plan') && 'active')}>
            <span className="nav-label">{t?.myPlan || 'My Plan'}</span>
          </Link>
          <Link to="/billing-history" className={cn('sidebar-nav-item', isPathActive('/billing-history') && 'active')}>
            <span className="nav-label">{t?.billingHistory || 'Billing History'}</span>
          </Link>
        </div>
      )}

      {/* ── Admin ── */}
      {isAdmin && (
        <>
          <div className="sidebar-nav-separator" />
          <Link to={adminHref} className={cn('sidebar-nav-item', isAdminActive && 'active')}>
            <Shield className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label">{t?.system || 'Admin'}</span>
          </Link>
        </>
      )}
    </div>
  );
}

/* ─── Helper: collapsed single item with tooltip ─── */
function TreeItemCollapsed({ icon: Icon, label, href, active }: { icon: any; label: string; href: string; active: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to={href} className={cn('sidebar-nav-item', active && 'active')}>
          <Icon className="nav-icon" strokeWidth={1.8} />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        <p className="font-medium">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
