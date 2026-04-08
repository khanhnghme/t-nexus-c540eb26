import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardLayoutContext } from '@/contexts/DashboardLayoutContext';
import UserAvatar from '@/components/UserAvatar';
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
} from 'lucide-react';
import SidebarTreeNav from '@/components/SidebarTreeNav';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import tNexusLogo from '@/assets/t-nexus-logo.png';
import tNexusTextWhite from '@/assets/t-nexus-text-white.png';
import UserChangePasswordDialog from '@/components/UserChangePasswordDialog';
import AvatarUpload from '@/components/AvatarUpload';
import AIAssistantButton from '@/components/ai/AIAssistantButton';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceBilling, formatPlanName } from '@/hooks/useWorkspaceBilling';
import TopBar from '@/components/layout/TopBar';
import { ChevronsUpDown, Check, Plus } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Upgrade Box                                                        */
/* ------------------------------------------------------------------ */
function UpgradeBox({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const { activeWorkspace, workspaceRole, isAvailable } = useWorkspace();
  const { ownerPlan, ownerId } = useWorkspaceBilling();

  const isOwner = user?.id === ownerId;
  if (!isAvailable || !activeWorkspace || workspaceRole !== 'workspace_owner') return null;

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
            Nâng cấp để mở khóa thêm
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
  const { user, profile, isAdmin, isLeader, signOut, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { locale } = useLanguage();
  const isDark = theme === 'dark';
  const { sidebarCollapsed, toggleSidebar } = useDashboardLayoutContext();
  const { activeWorkspace, workspaces, switchWorkspace, isAvailable } = useWorkspace();

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
    if (isLeader) return 'Thành viên NC';
    return 'Thành viên';
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
        <button
          onClick={() => setIsMobileOpen(true)}
          className="flex items-center justify-center w-10 h-10 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={tNexusLogo} alt="T-Nexus" className="h-7 w-7" />
          <img src={tNexusTextWhite} alt="T-Nexus" className="h-4 w-auto mobile-logo-text" />
        </Link>
        <div className="flex items-center gap-1" />
      </div>

      {/* ===== GRID LAYOUT ===== */}
      <TooltipProvider delayDuration={0}>
        <div className={cn(
          'dashboard-grid',
          sidebarCollapsed && 'sidebar-collapsed',
          isMobileOpen && 'mobile-sidebar-open'
        )}>
          {/* Cell 1: Top-left — Workspace Switcher */}
          <div className="grid-cell-logo">
            {isAvailable && activeWorkspace ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 min-w-0 w-full px-1 py-1 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="ws-avatar-mini shrink-0">
                      {activeWorkspace.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="sidebar-logo-text whitespace-nowrap overflow-hidden">
                      <span className="text-xs font-semibold truncate" style={{ color: 'var(--_sb-fg)' }}>
                        {activeWorkspace.name}
                      </span>
                    </span>
                    <ChevronsUpDown className="w-3 h-3 shrink-0 opacity-40 sidebar-logo-text" style={{ color: 'var(--_sb-muted)' }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Workspaces</p>
                  </div>
                  {workspaces.map(ws => (
                    <DropdownMenuItem
                      key={ws.id}
                      onClick={() => switchWorkspace(ws.id)}
                      className={cn('gap-2', ws.id === activeWorkspace.id && 'bg-accent')}
                    >
                      <div className="ws-avatar-mini">
                        {ws.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate flex-1 text-sm">{ws.name}</span>
                      {ws.id === activeWorkspace.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/workspace/new')} className="gap-2">
                    <Plus className="w-3.5 h-3.5" />
                    <span>{locale === 'vi' ? 'Tạo Workspace mới' : 'Create new Workspace'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
                <img src={tNexusLogo} alt="T-Nexus" className="h-7 w-7 shrink-0" />
                <span className="sidebar-logo-text whitespace-nowrap overflow-hidden">
                  <img src={tNexusTextWhite} alt="T-Nexus" className="h-[15px] w-auto max-w-full" />
                </span>
              </Link>
            )}

            {/* Desktop toggle */}
            <button
              className={cn(
                "hidden md:flex items-center justify-center transition-all bg-background border border-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted z-50",
                sidebarCollapsed
                  ? "absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full"
                  : "sidebar-toggle-btn ml-auto relative"
              )}
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Mobile close */}
            <button
              className="sidebar-toggle-btn ml-auto md:hidden"
              onClick={() => setIsMobileOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cell 2: Top-right — Top Bar */}
          <TopBar />

          {/* Cell 3: Bottom-left — Sidebar */}
          <div className="grid-cell-sidebar">
            {/* Scrollable nav */}
            <div className="sidebar-nav-scroll">
              <SidebarTreeNav collapsed={sidebarCollapsed} />
            </div>

            {/* Bottom section */}
            <div className="sidebar-bottom">
              <UpgradeBox collapsed={sidebarCollapsed} />

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
                        {profile?.full_name || 'Đang tải...'}
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
                      <p className="text-xs text-muted-foreground">MSSV: {profile?.student_id}</p>
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
            <div className="max-w-[1100px] mx-auto px-12 py-8">
              {useOutlet ? <Outlet /> : children}
            </div>
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
            <DialogTitle>Cập nhật ảnh đại diện</DialogTitle>
            <DialogDescription>
              Nhấn vào ảnh để tải lên ảnh mới (tối đa 5MB)
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

      {/* AI Assistant */}
      <AIAssistantButton
        projectId={projectId}
        projectName={projectName}
        zaloLink={zaloLink}
      />
    </>
  );
}
