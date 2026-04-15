import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardLayoutContext } from '@/contexts/DashboardLayoutContext';
import { Moon, Sun, LayoutDashboard, Layers, Users, Award, FolderOpen, Video, Activity, Settings, PanelLeft, FileText, ChevronRight, MoreHorizontal, ArrowLeft, History, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import tNexusTextWhite from '@/assets/t-nexus-text-white.png';
import { TNexusLogo } from '@/components/TNexusLogo';
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

const customProjectTabs: NavTab[] = [
  { id: 'pages', labelKey: 'pages', icon: FileText, showAlways: true },
  { id: 'members', labelKey: 'members', icon: Users, showAlways: true },
  { id: 'resources', labelKey: 'resources', icon: FolderOpen, showAlways: true },
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
  const { projectNavProps, projectInfo, toggleSidebar, aiTopBarProps } = useDashboardLayoutContext();
  const isDark = theme === 'dark';
  const pageTitle = getBreadcrumb(location.pathname, locale);
  const isAIRoute = location.pathname === '/ai-assistant';

  const isProjectMode = !!projectNavProps;
  const isCustomMode = projectNavProps?.projectMode === 'custom';

  // Inline rename state
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingName]);

  const startEditing = () => {
    if (!projectNavProps?.isLeaderInGroup) return;
    setDraftName(projectInfo.projectName || '');
    setEditingName(true);
  };

  const commitRename = () => {
    setEditingName(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== projectInfo.projectName) {
      projectNavProps?.onRenameProject?.(trimmed);
    }
  };

  const cancelEditing = () => {
    setEditingName(false);
  };

  const tabSource = isCustomMode ? customProjectTabs : projectTabs;
  const visibleTabs = isProjectMode
    ? tabSource.filter(tab => {
        if (tab.showAlways) return true;
        const showSettings = projectNavProps.isLeaderInGroup && projectNavProps.isGroupCreator;
        if (tab.id === 'settings') return showSettings;
        if (tab.id === 'logs') return projectNavProps.isLeaderInGroup && projectNavProps.isGroupCreator;
        return false;
      })
    : [];

  const tabButtons = visibleTabs.map((tab) => {
    const Icon = tab.icon;
    const isActive = projectNavProps?.activeTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => projectNavProps?.onTabChange(tab.id)}
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
          {tab.id === 'meetings' && projectNavProps?.hasActiveMeeting && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
            </span>
          )}
          {tab.id === 'scores' && projectNavProps?.isScoreFinalized && !isActive && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
          )}
        </div>
        <span className="hidden lg:inline">{navT[tab.labelKey] || tab.labelKey}</span>
        {tab.id === 'members' && projectNavProps && (
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
  });

  return (
    <div className="grid-cell-topbar">
      {isProjectMode && isCustomMode ? (
        /* Custom mode: breadcrumb left, tabs center */
        <div className="flex items-center min-w-0 overflow-x-auto scrollbar-none flex-1">
          {/* Left: back + breadcrumb */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-accent shrink-0 mr-1"
                  onClick={() => navigate('/groups')}
                >
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{locale === 'vi' ? 'Quay lại' : 'Go back'}</p>
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-1 shrink-0">
              <Link to="/groups" className="hidden sm:inline text-xs text-muted-foreground hover:text-foreground transition-colors">
                {locale === 'vi' ? 'Dự án' : 'Projects'}
              </Link>
              <ChevronRight className="w-3 h-3 text-muted-foreground hidden sm:block" />
              {editingName ? (
                <input
                  ref={inputRef}
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') cancelEditing();
                  }}
                  onBlur={commitRename}
                  className="text-xs font-medium bg-transparent border-b border-primary/50 outline-none px-0.5 py-0 max-w-[160px] text-foreground"
                />
              ) : (
                <span
                  onClick={startEditing}
                  className={cn(
                    "text-xs font-medium text-foreground max-w-[160px] truncate",
                    projectNavProps?.isLeaderInGroup && "cursor-text hover:border-b hover:border-dashed hover:border-muted-foreground/50"
                  )}
                  title={projectInfo.projectName}
                >
                  {projectInfo.projectName || '...'}
                </span>
              )}
            </div>
          </div>
          {/* Center: tabs */}
          <div className="flex items-center gap-0.5 mx-auto">
            {tabButtons}
          </div>
        </div>
      ) : (
        <div className={cn(
          "flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-none flex-1",
          isProjectMode && "justify-center"
        )}>
          {isProjectMode ? (
            <div className="flex items-center gap-0.5 mx-auto">
              {tabButtons}
            </div>
          ) : (
            isAIRoute && aiTopBarProps ? (
              <div className="flex items-center gap-2">
                <button onClick={aiTopBarProps.onToggleHistory} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <History className="h-4 w-4" />
                </button>
                <TNexusLogo width={80} />
                <span className="text-xs text-muted-foreground">AI</span>
              </div>
            ) : (
              <h1 className="text-sm font-semibold truncate" style={{ color: 'var(--_sb-fg, hsl(var(--foreground)))' }}>
                {pageTitle}
              </h1>
            )
          )}
        </div>
      )}

      <div className="flex items-center gap-2 shrink-0">
        {isAIRoute && aiTopBarProps && (
          <>
            {!aiTopBarProps.isUnlimited && (
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500",
                      aiTopBarProps.maxQuestions && (aiTopBarProps.questionsToday / aiTopBarProps.maxQuestions) > 0.8 ? "bg-destructive" : "bg-primary"
                    )}
                    style={{ width: `${aiTopBarProps.maxQuestions ? Math.min(100, (aiTopBarProps.questionsToday / aiTopBarProps.maxQuestions) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">{aiTopBarProps.questionsToday}/{aiTopBarProps.maxQuestions}</span>
              </div>
            )}
            {aiTopBarProps.hasMessages && (
              <button
                onClick={aiTopBarProps.onClearChat}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
        <div className="hidden md:flex items-center gap-2">
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
    </div>
  );
}