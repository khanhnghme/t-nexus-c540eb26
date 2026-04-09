import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceProjects } from '@/hooks/useWorkspaceProjects';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorkspaceBilling, formatPlanName } from '@/hooks/useWorkspaceBilling';
import { cn } from '@/lib/utils';
import {
  Home,
  Building2,
  Users,
  FolderKanban,
  ChevronRight,
  Lock,
  Globe,
  Users as UsersIcon,
  CalendarDays,
  MessageSquare,
  UserCircle,
  Settings,
  BookOpen,
  Lightbulb,
  FolderArchive,
  Shield,
  Wrench,
  Plus,
  LayoutGrid,
  ChevronsUpDown,
  Check,
  FolderOpen,
  Bell,
  Zap,
  CreditCard,
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
  const { translations } = useLanguage();
  const { ownerPlan } = useWorkspaceBilling();
  const t = translations.app?.sidebar;

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
    if (path.startsWith('/p/')) {
      setExpanded('projects');
    } else if (path === '/personal-info' || path === '/account-settings') {
      setExpanded('account');
    }
  }, [location.pathname]);

  const isProjectsExpanded = expanded === 'projects';

  const getRoleBadge = (role?: string | null) => {
    switch (role) {
      case 'workspace_owner': return '👑';
      case 'workspace_admin': return '🛡️';
      case 'workspace_member': return '🎫';
      default: return '🎫';
    }
  };

  const getRoleLabel = (role?: string | null) => {
    switch (role) {
      case 'workspace_owner': return 'Owner';
      case 'workspace_admin': return 'Admin';
      case 'workspace_member': return 'Member';
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
  const projectPaths = projects.map(p => `/p/${p.slug || p.id}`);

  /* ─── Collapsed mode ─── */
  if (collapsed) {
    return (
      <div className="tree-nav">
        {/* Dashboard */}
        <TreeItemCollapsed icon={Home} label={t?.home || 'Home'} href="/dashboard" active={isPathActive('/dashboard')} />

        {/* Notifications */}
        <TreeItemCollapsed icon={Bell} label={t?.notifications || 'Notifications'} href="/notifications" active={isPathActive('/notifications')} />

        {/* All Projects */}
        <TreeItemCollapsed icon={FolderKanban} label={t?.projects || 'Projects'} href="/groups" active={isPathActive('/groups')} />

        {/* Workspace pages */}
        {isAvailable && activeWorkspace && !isGuest && (
          <>
            <TreeItemCollapsed icon={LayoutGrid} label={t?.overview || 'Overview'} href="/workspace/settings" active={isPathActive('/workspace/settings')} />
            <TreeItemCollapsed icon={Users} label={t?.members || 'Members'} href="/workspace/members" active={isPathActive('/workspace/members')} />
          </>
        )}

        <div className="sidebar-nav-separator" />

        {/* Personal */}
        {personalItems.map(item => (
          <TreeItemCollapsed key={item.href} icon={item.icon} label={item.name} href={item.href} active={isPathActive(item.href)} />
        ))}
        <TreeItemCollapsed icon={UserCircle} label={t?.account || 'Account'} href="/personal-info" active={isPathActive('/personal-info') || isPathActive('/account-settings')} />
        <TreeItemCollapsed icon={CreditCard} label={t?.servicePlan || 'Service Plan'} href="/service-plan" active={isPathActive('/service-plan')} />

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
      {isAvailable && activeWorkspace && (
        <div className="ws-nav-section">
          {/* Dashboard */}
          <Link to="/dashboard" className={cn('sidebar-nav-item', isPathActive('/dashboard') && 'active')}>
            <Home className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label">{t?.home || 'Home'}</span>
          </Link>

          {/* Notifications */}
          <Link to="/notifications" className={cn('sidebar-nav-item', isPathActive('/notifications') && 'active')}>
            <Bell className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label">{t?.notifications || 'Notifications'}</span>
          </Link>

          {/* Workspace management - only for non-guest */}
          {!isGuest && (
            <>
              <Link to="/workspace/settings" className={cn('sidebar-nav-item', isPathActive('/workspace/settings') && 'active')}>
                <LayoutGrid className="nav-icon" strokeWidth={1.8} />
                <span className="nav-label">{t?.overview || 'Overview'}</span>
              </Link>
              <Link to="/workspace/members" className={cn('sidebar-nav-item', isPathActive('/workspace/members') && 'active')}>
                <Users className="nav-icon" strokeWidth={1.8} />
                <span className="nav-label">{t?.members || 'Members'}</span>
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

              {projects.map(p => {
                const href = `/p/${p.slug || p.id}`;
                const active = location.pathname.startsWith(href);
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

          {/* Service Plan — standalone item */}
          <Link
            to="/service-plan"
            className={cn('sidebar-nav-item', isPathActive('/service-plan') && 'active')}
          >
            <CreditCard className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label">{t?.servicePlan || 'Service Plan'}</span>
          </Link>
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
