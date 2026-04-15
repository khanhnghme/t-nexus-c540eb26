import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorkspaceBilling, formatPlanName } from '@/hooks/useWorkspaceBilling';
import { cn } from '@/lib/utils';
import {
  Home,
  Building2,
  Users,
  FolderKanban,
  ChevronRight,
  CalendarDays,
  MessageSquare,
  UserCircle,
  BookOpen,
  Lightbulb,
  Shield,
  Plus,
  Sparkles,
  FolderOpen,
  Bell,
  CreditCard,
  Search,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SidebarTreeNavProps {
  collapsed?: boolean;
}

export default function SidebarTreeNav({ collapsed }: SidebarTreeNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const { activeWorkspace, workspaces, switchWorkspace, isAvailable, workspaceRole } = useWorkspace();
  const { translations } = useLanguage();
  const billing = useWorkspaceBilling();
  const ownerPlan = billing?.ownerPlan;
  const t = translations.app?.sidebar;

  const isGuest = isAvailable && !!activeWorkspace && !workspaceRole;

  const hiddenNav = Array.isArray(profile?.nav_hidden_pages)
    ? (profile.nav_hidden_pages as string[])
    : [];

  // Expanded state — accordion: only one submenu open at a time
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = useCallback((key: string) => {
    setExpanded(prev => (prev === key ? null : key));
  }, []);

  // Auto-expand based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/workspace/new') return;
    if (path === '/personal-info' || path === '/account-settings') {
      setExpanded('account');
    } else if (path === '/service-plan' || path === '/billing-history') {
      setExpanded('billing');
    }
  }, [location.pathname]);

  // Project filter links
  const projectItems = [
    { name: t?.allProjects || 'All projects', href: '/groups', icon: FolderKanban, matchPath: '/groups' },
    { name: t?.createdByMe || 'Created by me', href: '/groups/created', icon: FolderOpen, matchPath: '/groups/created' },
    { name: t?.sharedWithMe || 'Shared with me', href: '/groups/shared', icon: Users, matchPath: '/groups/shared' },
  ];

  const isProjectFilterActive = (matchPath: string) => {
    if (matchPath === '/groups') {
      return location.pathname === '/groups' || location.pathname === '/groups/';
    }
    return location.pathname === matchPath || location.pathname.startsWith(matchPath + '/');
  };

  const getRoleBadge = (role?: string | null) => {
    switch (role) {
      case 'workspace:owner': return '👑';
      case 'workspace:admin': return '🛡️';
      case 'workspace:member': return '🎫';
      default: return '🎫';
    }
  };

  const getRoleLabel = (role?: string | null) => {
    switch (role) {
      case 'workspace:owner': return 'Owner';
      case 'workspace:admin': return 'Admin';
      case 'workspace:member': return 'Member';
      default: return '';
    }
  };

  // Navigation items
  const accountExpanded = expanded === 'account';

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

  const isPathActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    if (href.startsWith('/groups?')) return false; // handled by isProjectFilterActive
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  /* ─── Collapsed mode ─── */
  if (collapsed) {
    return (
      <div className="tree-nav">
        {/* Dashboard */}
        <TreeItemCollapsed icon={Home} label={t?.home || 'Home'} href="/dashboard" active={isPathActive('/dashboard')} />

        {/* Search */}
        <TreeItemCollapsed icon={Search} label={t?.search || 'Search'} href="/search" active={isPathActive('/search')} />

        {/* Notifications */}
        <TreeItemCollapsed icon={Bell} label={t?.notifications || 'Notifications'} href="/notifications" active={isPathActive('/notifications')} />

        {/* Projects — dropdown with filters */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Link
                  to="/groups"
                  className={cn('sidebar-nav-item', location.pathname.startsWith('/groups') && 'active')}
                  onClick={(e) => e.preventDefault()}
                >
                  <FolderKanban className="nav-icon" strokeWidth={1.8} />
                </Link>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              <p className="font-medium">{t?.projects || 'Projects'}</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="start" sideOffset={8}>
            {projectItems.map(item => (
              <DropdownMenuItem key={item.matchPath} asChild>
                <Link to={item.href} className={cn(isProjectFilterActive(item.matchPath) && 'font-semibold')}>
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Workspace pages */}
        {isAvailable && activeWorkspace && !isGuest && (
          <>
            <TreeItemCollapsed icon={Sparkles} label={t?.aiAssistant || 'AI Assistant'} href="/ai-assistant" active={isPathActive('/ai-assistant')} />
          </>
        )}

        <div className="sidebar-nav-separator" />

        {/* Personal */}
        {personalItems.map(item => (
          <TreeItemCollapsed key={item.href} icon={item.icon} label={item.name} href={item.href} active={isPathActive(item.href)} />
        ))}
        <TreeItemCollapsed icon={UserCircle} label={t?.account || 'Account'} href="/personal-info" active={isPathActive('/personal-info') || isPathActive('/account-settings')} />
        <TreeItemCollapsed icon={CreditCard} label={t?.servicePlan || 'Service Plan'} href="/service-plan" active={isPathActive('/service-plan') || isPathActive('/billing-history')} />

        {/* Admin — single item */}
        {isAdmin && (
          <TreeItemCollapsed icon={Shield} label={t?.system || 'Admin'} href={adminHref} active={isAdminActive} />
        )}
      </div>
    );
  }

  /* ─── Expanded mode ─── */
  return (
    <div className="tree-nav">

      {isGuest && (
        <div className="tree-guest-hint">
          {t?.guestHint || '👽 You are accessing as a guest'}
        </div>
      )}

      {/* ══ Workspace Navigation ══ */}
      {isAvailable && activeWorkspace ? (
        <div className="ws-nav-section">
          {/* Dashboard */}
          <Link to="/dashboard" className={cn('sidebar-nav-item', isPathActive('/dashboard') && 'active')}>
            <Home className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label">{t?.home || 'Home'}</span>
          </Link>

          {/* Search */}
          <Link to="/search" className={cn('sidebar-nav-item', isPathActive('/search') && 'active')}>
            <Search className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label">{t?.search || 'Search'}</span>
          </Link>

          {/* Notifications */}
          <Link to="/notifications" className={cn('sidebar-nav-item', isPathActive('/notifications') && 'active')}>
            <Bell className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label">{t?.notifications || 'Notifications'}</span>
          </Link>

          {/* Workspace management - only for non-guest */}
          {!isGuest && (
            <>
              <Link to="/ai-assistant" className={cn('sidebar-nav-item', isPathActive('/ai-assistant') && 'active')}>
                <Sparkles className="nav-icon" strokeWidth={1.8} />
                <span className="nav-label">{t?.aiAssistant || 'AI Assistant'}</span>
              </Link>
            </>
          )}

        </div>
      ) : (
        <div className="ws-nav-section">
          <Link to="/dashboard" className={cn('sidebar-nav-item', isPathActive('/dashboard') && 'active')}>
            <Home className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label">{t?.home || 'Home'}</span>
          </Link>
          <Link to="/search" className={cn('sidebar-nav-item', isPathActive('/search') && 'active')}>
            <Search className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label">{t?.search || 'Search'}</span>
          </Link>
          <Link to="/notifications" className={cn('sidebar-nav-item', isPathActive('/notifications') && 'active')}>
            <Bell className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label">{t?.notifications || 'Notifications'}</span>
          </Link>
          <div className="mx-2 my-3 p-3 rounded-xl border border-dashed border-muted-foreground/30 text-center">
            <Building2 className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground mb-2">
              {translations.app?.sidebar?.noWorkspace || 'You don\'t have a workspace yet'}
            </p>
            <button
              onClick={() => navigate('/workspace/new')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {translations.app?.sidebar?.createWorkspace || 'Create Workspace'}
            </button>
          </div>
        </div>
      )}

      {/* ── Projects section ── */}
      {isAvailable && activeWorkspace && (
        <>
          <div className="sidebar-nav-separator" />
          <div className="sidebar-section-label">{t?.projects || 'PROJECTS'}</div>
          {projectItems.map(item => (
            <Link
              key={item.matchPath}
              to={item.href}
              className={cn('sidebar-nav-item', isProjectFilterActive(item.matchPath) && 'active')}
            >
              <item.icon className="nav-icon" strokeWidth={1.8} />
              <span className="nav-label">{item.name}</span>
            </Link>
          ))}
        </>
      )}

      {/* ── Personal section ── */}
      {(personalItems.length > 0 || true) && (
        <>
          <div className="sidebar-nav-separator" />
          <div className="sidebar-section-label">{t?.personal || 'PERSONAL'}</div>
          {personalItems.map(item => (
            <Link key={item.href} to={item.href} className={cn('sidebar-nav-item', isPathActive(item.href) && 'active')}>
              <item.icon className="nav-icon" strokeWidth={1.8} />
              <span className="nav-label">{item.name}</span>
            </Link>
          ))}

          {/* Account tree node */}
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
                <Link
                  key={child.href}
                  to={child.href}
                  className={cn('sidebar-nav-item', isPathActive(child.href) && 'active')}
                >
                  <span className="nav-label">{child.name}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Service Plan — tree with billing history */}
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
              <Link
                to="/service-plan"
                className={cn('sidebar-nav-item', isPathActive('/service-plan') && 'active')}
              >
                <span className="nav-label">{t?.myPlan || 'My Plan'}</span>
              </Link>
              <Link
                to="/billing-history"
                className={cn('sidebar-nav-item', isPathActive('/billing-history') && 'active')}
              >
                <span className="nav-label">{t?.billingHistory || 'Billing History'}</span>
              </Link>
            </div>
          )}
        </>
      )}


      {/* ── Admin — single link ── */}
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
