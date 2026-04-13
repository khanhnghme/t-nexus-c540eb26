import { LayoutDashboard, Layers, Users, Activity, Settings, Award, FolderOpen, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProjectNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isLeaderInGroup: boolean;
  isGroupCreator: boolean;
  membersCount: number;
  hasActiveMeeting?: boolean;
  isScoreFinalized?: boolean;
}

interface NavTab {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  showAlways?: boolean;
}

const tabs: NavTab[] = [
  { id: 'overview', labelKey: 'overview', icon: LayoutDashboard, showAlways: true },
  { id: 'tasks', labelKey: 'tasks', icon: Layers, showAlways: true },
  { id: 'meetings', labelKey: 'meetings', icon: Video, showAlways: true },
  { id: 'resources', labelKey: 'resources', icon: FolderOpen, showAlways: true },
  { id: 'members', labelKey: 'members', icon: Users, showAlways: true },
  { id: 'scores', labelKey: 'scores', icon: Award, showAlways: true },
  { id: 'logs', labelKey: 'logs', icon: Activity, showAlways: false },
  { id: 'settings', labelKey: 'settings', icon: Settings, showAlways: false },
];

export default function ProjectNavigation({
  activeTab,
  onTabChange,
  isLeaderInGroup,
  isGroupCreator,
  membersCount,
  hasActiveMeeting,
  isScoreFinalized,
}: ProjectNavigationProps) {
  const { translations: { app: { projectNav: t } } } = useLanguage();
  const showSettings = isLeaderInGroup && isGroupCreator;
  const showLogs = isLeaderInGroup && isGroupCreator;
  const visibleTabs = tabs.filter(tab =>
    tab.showAlways || (tab.id === 'settings' && showSettings) || (tab.id === 'logs' && showLogs)
  );

  return (
    <div className="flex justify-center w-full mb-6">
      <div className="inline-flex flex-wrap items-center justify-center gap-1">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                "whitespace-nowrap rounded-md",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <div className="relative">
                <Icon className="w-4 h-4 shrink-0" />
                {tab.id === 'meetings' && hasActiveMeeting && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                  </span>
                )}
                {tab.id === 'scores' && isScoreFinalized && !isActive && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                  </span>
                )}
              </div>

              <span>{t[tab.labelKey]}</span>

              {tab.id === 'members' && (
                <span className={cn(
                  "px-1.5 py-0 text-[11px] font-semibold rounded-full min-w-[20px] text-center",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "bg-muted-foreground/15 text-muted-foreground"
                )}>
                  {membersCount}
                </span>
              )}

              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
