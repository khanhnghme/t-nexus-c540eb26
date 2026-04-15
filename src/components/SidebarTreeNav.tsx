import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceProjects, WorkspaceProject } from '@/hooks/useWorkspaceProjects';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorkspaceBilling, formatPlanName } from '@/hooks/useWorkspaceBilling';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Home,
  Users,
  FolderKanban,
  ChevronRight,
  Lock,
  Globe,
  CalendarDays,
  MessageSquare,
  UserCircle,
  Settings,
  BookOpen,
  Lightbulb,
  Shield,
  Plus,
  LayoutGrid,
  Sparkles,
  ChevronsUpDown,
  Check,
  FolderOpen,
  Bell,
  Zap,
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
  const { projects, isGuest } = useWorkspaceProjects();
  const { user } = useAuth();
  const { translations } = useLanguage();
  const billing = useWorkspaceBilling();
  const ownerPlan = billing?.ownerPlan;
  const t = translations.app?.sidebar;

  const hiddenNav = Array.isArray(profile?.nav_hidden_pages)
    ? (profile.nav_hidden_pages as string[])
    : [];

  // Expanded state — accordion: only one submenu open at a time
  const [expanded, setExpanded] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  // Fetch hidden project ids
  useEffect(() => {
    if (!user) return;
    supabase
      .from('hidden_projects')
      .select('group_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setHiddenIds(new Set((data || []).map(d => d.group_id)));
      });
  }, [user]);

  // If >9 projects, filter out hidden ones from sidebar
  const MAX_SIDEBAR_PROJECTS = 9;
  const visibleProjects = projects.length > MAX_SIDEBAR_PROJECTS
    ? projects.filter(p => !hiddenIds.has(p.id))
    : projects;

  const toggle = useCallback((key: string) => {
    setExpanded(prev => (prev === key ? null : key));
  }, []);

  // Auto-expand based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/workspace/new') return;
    if (path.startsWith('/pr/') || path.startsWith('/p/')) {
      setExpanded('projects');
    } else if (path === '/personal-info' || path === '/account-settings') {
      setExpanded('account');
    } else if (path === '/service-plan' || path === '/billing-history') {
      setExpanded('billing');
    }
  }, [location.pathname]);

  const isProjectsExpanded = expanded === 'projects';

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
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const hasActiveChild = (paths: string[]) => paths.some(p => isPathActive(p));
  const getProjectHref = (p: WorkspaceProject) => {
    if (!activeWorkspace?.short_id) return `/p/${p.slug || p.id}`;
    const prefix = p.project_mode === 'custom' ? '/pa' : '/pr';
    return `${prefix}/ws-${activeWorkspace.short_id}/${p.slug || p.id}`;
  };
  const projectPaths = visibleProjects.map(p => getProjectHref(p));

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

        {/* All Projects */}
        <TreeItemCollapsed icon={FolderKanban} label={t?.projects || 'Projects'} href="/groups" active={isPathActive('/groups')} />

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

          {/* Projects sub-tree */}
          <button
            onClick={() => toggle('projects')}
            className={cn(
              'sidebar-nav-item w-full text-left group',
              hasActiveChild(projectPaths) && !isProjectsExpanded && 'semi-active'
            )}
          >
            <ChevronRight className={cn('nav-chevron', isProjectsExpanded && 'expanded')} />
            <FolderKanban className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label">{t?.projects || 'Projects'}</span>
            <span className="text-[10px] opacity-40 tabular-nums">{projects.length}</span>
          </button>

          {isProjectsExpanded && (
            <div className="tree-children tree-level-1">
              {/* View all projects link */}
              <Link
                to="/groups"
                className={cn('sidebar-nav-item', location.pathname === '/groups' && 'active')}
              >
                <span className="nav-label text-muted-foreground">{t?.viewAll || 'View all'}</span>
              </Link>

              {visibleProjects.map(p => {
                const href = getProjectHref(p);
                const active = location.pathname === href || location.pathname.startsWith(href + '/');
                return (
                  <Link
                    key={p.id}
                    to={href}
                    className={cn('sidebar-nav-item', active && 'active', !p.isMember && 'opacity-60')}
                  >
                    <span className="nav-label truncate">{p.name}</span>
                    {!p.isMember && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">{t?.newLabel || 'New'}</span>
                    )}
                  </Link>
                );
              })}
            </div>
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
