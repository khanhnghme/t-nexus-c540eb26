import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardLayoutContext } from '@/contexts/DashboardLayoutContext';
import { Moon, Sun, LayoutDashboard, Layers, Users, Award, FolderOpen, Video, Activity, Settings, PanelLeft, FileText, ChevronRight, MoreHorizontal, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import tNexusTextWhite from '@/assets/t-nexus-text-white.png';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const routeLabels: Record<string, { vi: string; en: string }> = {
  '/dashboard': { vi: 'Trang chủ', en: 'Home' },
  '/groups': { vi: 'Dự án', en: 'Projects' },
  '/calendar': { vi: 'Lịch', en: 'Calendar' },
  '/communication': { vi: 'Tin nhắn', en: 'Messages' },
  '/knowledge-base': { vi: 'Kiến thức', en: 'Knowledge' },
  '/ideas': { vi: 'Ý tưởng', en: 'Ideas' },
  '/admin': { vi: 'Quản trị', en: 'Admin' },
  '/personal-info': { vi: 'Cá nhân', en: 'Personal' },
  '/service-plan': { vi: 'Gói dịch vụ', en: 'Service Plan' },
  '/upgrade': { vi: 'Nâng cấp', en: 'Upgrade' },
};

interface NavTab {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  showAlways?: boolean;
}

const projectTabs: NavTab[] = [
  { id: 'overview', labelKey: 'overview', icon: LayoutDashboard, showAlways: true },
  { id: 'tasks', labelKey: 'tasks', icon: Layers, showAlways: true },
  { id: 'meetings', labelKey: 'meetings', icon: Video, showAlways: true },
  { id: 'resources', labelKey: 'resources', icon: FolderOpen, showAlways: true },
  { id: 'members', labelKey: 'members', icon: Users, showAlways: true },
  { id: 'scores', labelKey: 'scores', icon: Award, showAlways: true },
  { id: 'logs', labelKey: 'logs', icon: Activity, showAlways: false },
  { id: 'settings', labelKey: 'settings', icon: Settings, showAlways: false },
];

function getBreadcrumb(pathname: string, locale: string) {
  const direct = routeLabels[pathname];
  if (direct) return direct[locale === 'vi' ? 'vi' : 'en'];

  for (const [route, label] of Object.entries(routeLabels)) {
    if (pathname.startsWith(route + '/')) {
      return label[locale === 'vi' ? 'vi' : 'en'];
    }
  }

  if (pathname.startsWith('/group/') || pathname.startsWith('/project/') || pathname.startsWith('/p/')) {
    return locale === 'vi' ? 'Chi tiết dự án' : 'Project Detail';
  }

  return locale === 'vi' ? 'Trang chủ' : 'Home';
}

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { locale, translations: { app: { projectNav: navT } } } = useLanguage();
  const { projectNavProps, projectInfo, toggleSidebar } = useDashboardLayoutContext();
  const isDark = theme === 'dark';
  const pageTitle = getBreadcrumb(location.pathname, locale);

  const isProjectMode = !!projectNavProps;
  const isCustomMode = projectNavProps?.projectMode === 'custom';

  const visibleTabs = (isProjectMode && !isCustomMode)
    ? projectTabs.filter(tab => {
        if (tab.showAlways) return true;
        const showSettings = projectNavProps.isLeaderInGroup && projectNavProps.isGroupCreator;
        const showLogs = projectNavProps.isLeaderInGroup && projectNavProps.isGroupCreator;
        if (tab.id === 'settings') return showSettings;
        if (tab.id === 'logs') return showLogs;
        return false;
      })
    : [];

  return (
    <div className="grid-cell-topbar">
      <div className={cn(
        "flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-none",
        isProjectMode && "flex-1 justify-center"
      )}>
        {isProjectMode && isCustomMode ? (
          /* ── AFFiNE-style TopBar for Custom/Canvas mode ── */
          <div className="flex items-center gap-2 w-full px-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-accent shrink-0"
                  onClick={() => navigate('/groups')}
                >
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{locale === 'vi' ? 'Quay lại' : 'Go back'}</p>
              </TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-border shrink-0" />

            <div className="flex items-center gap-1.5 min-w-0">
              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate max-w-[200px]" style={{ color: 'var(--_sb-fg, hsl(var(--foreground)))' }}>
                {projectInfo.projectName || pageTitle}
              </span>
            </div>
          </div>
        ) : isProjectMode ? (
          <div className="flex items-center gap-0.5 mx-auto">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = projectNavProps.activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => projectNavProps.onTabChange(tab.id)}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors duration-150",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                    "whitespace-nowrap shrink-0 rounded-md",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <div className="relative">
                    <Icon className="w-3.5 h-3.5" />
                    {tab.id === 'meetings' && projectNavProps.hasActiveMeeting && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                      </span>
                    )}
                    {tab.id === 'scores' && projectNavProps.isScoreFinalized && !isActive && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                      </span>
                    )}
                  </div>
                  <span>{navT[tab.labelKey]}</span>
                  {tab.id === 'members' && (
                    <span className={cn(
                      "px-1 py-0 text-[10px] font-semibold rounded-full min-w-[16px] text-center leading-tight",
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "bg-muted-foreground/15 text-muted-foreground"
                    )}>
                      {projectNavProps.membersCount}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-1.5 right-1.5 h-[2px] bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <h1 className="text-sm font-semibold truncate" style={{ color: 'var(--_sb-fg, hsl(var(--foreground)))' }}>
            {pageTitle}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-accent"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {isDark
                ? <Moon className="w-4 h-4 text-muted-foreground" />
                : <Sun className="w-4 h-4 text-muted-foreground" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{isDark ? 'Light mode' : 'Dark mode'}</p>
          </TooltipContent>
        </Tooltip>

        <Link to="/dashboard" className="flex items-center gap-1.5 ml-1 opacity-70 hover:opacity-100 transition-opacity">
          <img
            src={tNexusTextWhite}
            alt="T-Nexus"
            className="h-[13px] w-auto hidden sm:block"
            style={{ filter: isDark ? 'none' : 'invert(1)' }}
          />
        </Link>
      </div>
    </div>
  );
}