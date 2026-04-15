import { ReactNode, useState, useEffect, useMemo, Suspense } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardLayoutContext } from '@/contexts/DashboardLayoutContext';
import UserAvatar from '@/components/UserAvatar';
import ReadOnlyBanner from '@/components/ReadOnlyBanner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Key,
  Menu,
  X,
  UserCircle,
  Moon,
  Sun,
  LogOut,
  Zap,
  Crown,
  Check,
  Plus,
  ChevronsUpDown,
  ArrowLeft,
  Settings,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import SidebarTreeNav from '@/components/SidebarTreeNav';
import AdminSidebarNav from '@/components/AdminSidebarNav';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import tNexusTextWhite from '@/assets/t-nexus-text-white.png';
import UserChangePasswordDialog from '@/components/UserChangePasswordDialog';
import AvatarUpload from '@/components/AvatarUpload';

import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceBilling, formatPlanName } from '@/hooks/useWorkspaceBilling';
import TopBar from '@/components/layout/TopBar';

/* ------------------------------------------------------------------ */
/*  Admin Back Cell (top-left when in /admin)                           */
/* ------------------------------------------------------------------ */
function AdminBackCell({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const { translations } = useLanguage();
  const t = translations.app?.sidebar;

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate('/dashboard')}
            className="ws-switcher-compact ws-switcher-collapsed"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--_sb-fg)' }} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          <p className="font-medium">{t?.backToDashboard || 'Back to Dashboard'}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      onClick={() => navigate('/dashboard')}
      className="ws-switcher-compact"
      style={{ gap: '8px' }}
    >
      <ArrowLeft className="w-4 h-4 shrink-0" style={{ color: 'var(--_sb-fg)' }} />
      <span className="ws-name-compact">{t?.backToDashboard || 'Back to Dashboard'}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Workspace Switcher Cell (top-left)                                 */
/* ------------------------------------------------------------------ */
function WorkspaceSwitcherCell({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activeWorkspace, workspaces, switchWorkspace, isAvailable, workspaceRole } = useWorkspace();
  const billing = useWorkspaceBilling();
  const ownerPlan = billing?.ownerPlan;
  const { locale } = useLanguage();

  const [memberCount, setMemberCount] = useState<number>(0);
  useEffect(() => {
    if (!activeWorkspace?.id) { setMemberCount(0); return; }
    supabase
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', activeWorkspace.id)
      .then(({ count }) => setMemberCount((count ?? 0) + 1));
  }, [activeWorkspace?.id]);

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

  const planLabel = formatPlanName(ownerPlan);
  const isPaid = ownerPlan && ownerPlan !== 'plan_free';

  const dropdownBody = (
    <>
      {activeWorkspace && (
        <div className="p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {activeWorkspace.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{activeWorkspace.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {planLabel}
                {memberCount > 0 && ` · ${memberCount} ${locale === 'vi' ? 'thành viên' : (memberCount === 1 ? 'member' : 'members')}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/workspace/settings'); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/60 hover:bg-muted transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              {locale === 'vi' ? 'Cài đặt' : 'Settings'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/workspace/members'); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/60 hover:bg-muted transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              {locale === 'vi' ? 'Thành viên' : 'Members'}
            </button>
          </div>
        </div>
      )}
      <DropdownMenuSeparator />
      <div className="px-3 py-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {locale === 'vi' ? 'Tất cả workspace' : 'All workspaces'}
        </p>
      </div>
      {workspaces.map(ws => {
        return (
          <DropdownMenuItem key={ws.id} onClick={() => switchWorkspace(ws.id)} className={cn('gap-2 mx-1', ws.id === activeWorkspace?.id && 'bg-accent')}>
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
              {ws.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="truncate text-sm font-medium">{ws.name}</span>
              <span className="text-[10px] text-muted-foreground">{getRoleBadge(ws.my_role)} {getRoleLabel(ws.my_role)}</span>
            </div>
            {ws.id === activeWorkspace?.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
          </DropdownMenuItem>
        );
      })}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => navigate('/workspace/new')} className="gap-2 mx-1">
        <Plus className="w-3.5 h-3.5" />
        <span>{locale === 'vi' ? 'Tạo Workspace mới' : 'Create new Workspace'}</span>
      </DropdownMenuItem>
    </>
  );

  if (!isAvailable || !activeWorkspace) {
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate('/workspace/new')}
              className="ws-switcher-compact ws-switcher-collapsed"
            >
              <Plus className="w-4 h-4" style={{ color: 'var(--_sb-fg)' }} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            <p className="font-medium">{locale === 'vi' ? 'Tạo Workspace' : 'Create Workspace'}</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    return (
      <button
        onClick={() => navigate('/workspace/new')}
        className="ws-switcher-compact"
        style={{ gap: '8px' }}
      >
        <div className="ws-avatar-compact">+</div>
        <span className="ws-name-compact">{locale === 'vi' ? 'Tạo Workspace' : 'Create Workspace'}</span>
      </button>
    );
  }

  if (collapsed) {
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button className="ws-switcher-compact ws-switcher-collapsed">
                <div className="ws-avatar-mini">
                  {activeWorkspace.name.charAt(0).toUpperCase()}
                </div>
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            <p className="font-medium">{activeWorkspace.name}</p>
            <p className="text-[10px] text-muted-foreground">{getRoleBadge(workspaceRole)} {getRoleLabel(workspaceRole)}</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="right" align="start" className="w-72">
          {dropdownBody}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="ws-switcher-compact">
          <div className="ws-avatar-compact">
            {activeWorkspace.name.charAt(0).toUpperCase()}
          </div>
          <span className="ws-name-compact">{activeWorkspace.name}</span>
          {ownerPlan && (
            <span className={cn(
              "ws-plan-badge",
              isPaid ? 'ws-plan-badge--pro' : 'ws-plan-badge--free'
            )}>
              {planLabel}
            </span>
          )}
          <ChevronsUpDown className="w-3 h-3 shrink-0" style={{ color: 'var(--_sb-fg)' }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-72">
        {dropdownBody}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ */
/*  Upgrade Box                                                        */
/* ------------------------------------------------------------------ */
function UpgradeBox({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const { activeWorkspace, workspaceRole, isAvailable } = useWorkspace();
  const billing = useWorkspaceBilling();
  const ownerPlan = billing?.ownerPlan;
  const ownerId = billing?.ownerId;
  const { locale } = useLanguage();

  const isOwner = user?.id === ownerId;
  if (!isAvailable || !activeWorkspace || workspaceRole !== 'workspace:owner') return null;

  const planLabel = formatPlanName(ownerPlan);

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/upgrade"
            className="flex items-center justify-center w-9 h-9 mx-auto rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors mb-2"
          >
            <Zap className="w-4 h-4 text-amber-500" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          <p className="font-medium">Upgrade · {planLabel}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      to="/upgrade"
      className="block mx-2 mb-2 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors group no-underline"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
          <Crown className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            {planLabel} Plan
          </div>
          <div className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
            {locale === 'vi' ? 'Nâng cấp để mở khóa thêm' : 'Upgrade to unlock more'}
          </div>
        </div>
        <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Keyboard shortcut map                                              */
/* ------------------------------------------------------------------ */
const shortcutMap: Record<string, string> = {
  d: '/dashboard',
  p: '/groups',
  l: '/calendar',
  m: '/communication',
};

/* ------------------------------------------------------------------ */
/*  Layout component                                                   */
/* ------------------------------------------------------------------ */
interface DashboardLayoutProps {
  children?: ReactNode;
  projectId?: string;
  projectName?: string;
  zaloLink?: string | null;
  useOutlet?: boolean;
}

export default function DashboardLayout({
  children,
  projectId,
  projectName,
  zaloLink,
  useOutlet,
}: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, isSystemAdmin, signOut, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { locale } = useLanguage();
  const isDark = theme === 'dark';
  const { sidebarCollapsed, toggleSidebar, projectNavProps, projectInfo } = useDashboardLayoutContext();

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Activity tracking
  useActivityTracker(user?.id);

  useEffect(() => {
    const handler = () => refreshProfile();
    window.addEventListener('nav-visibility-changed', handler);
    return () => window.removeEventListener('nav-visibility-changed', handler);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      const dest = shortcutMap[key];
      if (dest) { e.preventDefault(); navigate(dest); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getRoleText = () => {
    if (isAdmin) return 'OwnerSystem';
    return locale === 'vi' ? 'Thành viên' : 'Member';
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`sidebar-mobile-backdrop ${isMobileOpen ? 'visible' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Mobile top bar */}
      <div className="dashboard-mobile-topbar">
        {projectNavProps ? (
          <>
            <button
              onClick={() => navigate('/groups')}
              className="flex items-center justify-center w-10 h-10 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium truncate max-w-[200px]">
              {projectInfo.projectName || '...'}
            </span>
            <button
              onClick={() => setIsMobileOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsMobileOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src={tNexusTextWhite} alt="T-Nexus" className="h-4 w-auto mobile-logo-text" />
            </Link>
            <div className="flex items-center gap-1" />
          </>
        )}
      </div>

      {/* ===== GRID LAYOUT ===== */}
      <TooltipProvider delayDuration={0}>
        <div className={cn(
          'dashboard-grid',
          sidebarCollapsed && 'sidebar-collapsed',
          isMobileOpen && 'mobile-sidebar-open',
          !!projectNavProps && 'has-project-nav'
        )}>
          {/* Cell 1: Top-left — Workspace Switcher or Admin Back */}
          <div className="grid-cell-logo">
            {location.pathname.startsWith('/admin') ? (
              <AdminBackCell collapsed={isMobileOpen ? false : sidebarCollapsed} />
            ) : (
              <WorkspaceSwitcherCell collapsed={isMobileOpen ? false : sidebarCollapsed} />
            )}

            {/* Desktop toggle — tiny pill at right edge */}
            <button
              className={cn(
                "hidden md:flex items-center justify-center transition-all z-50",
                sidebarCollapsed
                  ? "absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                  : "ws-toggle-inline"
              )}
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronLeft className="w-3 h-3" />
              )}
            </button>

            {/* Mobile close */}
            <button
              className="ws-toggle-inline md:hidden"
              onClick={() => setIsMobileOpen(false)}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Cell 2: Top-right — Top Bar */}
          <TopBar />

          {/* Cell 3: Bottom-left — Sidebar */}
          <div className="grid-cell-sidebar">
            {/* Scrollable nav */}
            <div className="sidebar-nav-scroll">
              {location.pathname.startsWith('/admin') ? (
                <AdminSidebarNav collapsed={isMobileOpen ? false : sidebarCollapsed} />
              ) : (
                <SidebarTreeNav collapsed={isMobileOpen ? false : sidebarCollapsed} />
              )}
            </div>

            {/* Bottom section */}
            <div className="sidebar-bottom">
              {!location.pathname.startsWith('/admin') && (
                <UpgradeBox collapsed={isMobileOpen ? false : sidebarCollapsed} />
              )}

              {/* User profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="sidebar-user-profile">
                    <UserAvatar
                      src={profile?.avatar_url}
                      name={profile?.full_name}
                      size="sm"
                      className="border border-white/20 shrink-0"
                    />
                    <div className="user-info">
                      <div className="user-name">
                        {profile?.full_name || (locale === 'vi' ? 'Đang tải...' : 'Loading...')}
                      </div>
                      <div className="user-role">{getRoleText()}</div>
                    </div>
                    <ChevronDown
                      className="user-chevron w-3.5 h-3.5 ml-auto shrink-0"
                      style={{ color: 'var(--_sb-muted)' }}
                    />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold">{profile?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{profile?.email}</p>
                      <p className="text-xs text-muted-foreground">{locale === 'vi' ? 'MSSV' : 'ID'}: {profile?.student_id}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                    <UserCircle className="w-4 h-4 mr-2" />
                    {locale === 'vi' ? 'Cập nhật ảnh đại diện' : 'Update avatar'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsChangePasswordOpen(true)}>
                    <Key className="w-4 h-4 mr-2" />
                    {locale === 'vi' ? 'Đổi mật khẩu' : 'Change password'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTheme(isDark ? 'light' : 'dark')}>
                    {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                    {isDark
                      ? (locale === 'vi' ? 'Chế độ sáng' : 'Light mode')
                      : (locale === 'vi' ? 'Chế độ tối' : 'Dark mode')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    {locale === 'vi' ? 'Đăng xuất' : 'Sign out'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Cell 4: Bottom-right — Main content */}
          <div className="grid-cell-content">
            {location.pathname === '/ai-assistant' ? (
              /* AI route: full-bleed, no wrapper padding — page owns its own layout */
              useOutlet ? (
                <Suspense fallback={
                  <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                }>
                  <Outlet />
                </Suspense>
              ) : children
            ) : (
              <div className="max-w-[1100px] mx-auto px-12 py-8 space-y-4">
                {location.pathname !== '/dashboard' && <ReadOnlyBanner compact />}
                {useOutlet ? (
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-20">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  }>
                    <Outlet />
                  </Suspense>
                ) : children}
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>

      {/* Dialogs */}
      <UserChangePasswordDialog
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
      />

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{locale === 'vi' ? 'Cập nhật ảnh đại diện' : 'Update avatar'}</DialogTitle>
            <DialogDescription>
              {locale === 'vi' ? 'Nhấn vào ảnh để tải lên ảnh mới (tối đa 5MB)' : 'Click to upload a new photo (max 5MB)'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <AvatarUpload
              currentAvatarUrl={profile?.avatar_url}
              fullName={profile?.full_name || ''}
              size="lg"
            />
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
