import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ProjectInfo {
  projectId?: string;
  projectName?: string;
  zaloLink?: string | null;
}

export interface ProjectNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isLeaderInGroup: boolean;
  isGroupCreator: boolean;
  membersCount: number;
  hasActiveMeeting?: boolean;
  isScoreFinalized?: boolean;
  projectMode?: 'basic' | 'custom';
  onRenameProject?: (newName: string) => void;
}

export interface AIAssistantTopBarProps {
  onToggleHistory: () => void;
  onClearChat: () => void;
  hasMessages: boolean;
}

interface DashboardLayoutContextType {
  projectInfo: ProjectInfo;
  setProjectInfo: (info: ProjectInfo) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  projectNavProps: ProjectNavProps | null;
  setProjectNavProps: (props: ProjectNavProps | null) => void;
  aiTopBarProps: AIAssistantTopBarProps | null;
  setAITopBarProps: (props: AIAssistantTopBarProps | null) => void;
}

const DashboardLayoutContext = createContext<DashboardLayoutContextType | null>(null);

export function DashboardLayoutProvider({ children }: { children: ReactNode }) {
  const [projectInfo, setProjectInfoState] = useState<ProjectInfo>({});
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved !== null) return saved === 'true';
      return window.innerWidth < 1024;
    }
    return false;
  });
  const [projectNavProps, setProjectNavPropsState] = useState<ProjectNavProps | null>(null);
  const [aiTopBarProps, setAITopBarPropsState] = useState<AIAssistantTopBarProps | null>(null);

  const setProjectInfo = useCallback((info: ProjectInfo) => {
    setProjectInfoState(info);
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedState(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  const setProjectNavProps = useCallback((props: ProjectNavProps | null) => {
    setProjectNavPropsState(props);
  }, []);

  const setAITopBarProps = useCallback((props: AIAssistantTopBarProps | null) => {
    setAITopBarPropsState(props);
  }, []);

  return (
    <DashboardLayoutContext.Provider value={{ projectInfo, setProjectInfo, sidebarCollapsed, setSidebarCollapsed, toggleSidebar, projectNavProps, setProjectNavProps, aiTopBarProps, setAITopBarProps }}>
      {children}
    </DashboardLayoutContext.Provider>
  );
}

export function useDashboardLayoutContext() {
  const ctx = useContext(DashboardLayoutContext);
  if (!ctx) throw new Error('useDashboardLayoutContext must be used within DashboardLayoutProvider');
  return ctx;
}
