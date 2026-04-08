import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import UserAvatar from '@/components/UserAvatar';
import { Moon, Sun, Search } from 'lucide-react';
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

function getBreadcrumb(pathname: string, locale: string) {
  // Direct match
  const direct = routeLabels[pathname];
  if (direct) return direct[locale === 'vi' ? 'vi' : 'en'];

  // Check prefix matches for nested routes
  for (const [route, label] of Object.entries(routeLabels)) {
    if (pathname.startsWith(route + '/')) {
      return label[locale === 'vi' ? 'vi' : 'en'];
    }
  }

  // Project detail pages
  if (pathname.startsWith('/group/') || pathname.startsWith('/project/')) {
    return locale === 'vi' ? 'Chi tiết dự án' : 'Project Detail';
  }

  return locale === 'vi' ? 'Trang chủ' : 'Home';
}

export default function TopBar() {
  const location = useLocation();
  const { profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { locale } = useLanguage();
  const isDark = theme === 'dark';
  const pageTitle = getBreadcrumb(location.pathname, locale);

  return (
    <div className="grid-cell-topbar">
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-sm font-semibold truncate" style={{ color: 'var(--_sb-fg, hsl(var(--foreground)))' }}>
          {pageTitle}
        </h1>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
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
      </div>
    </div>
  );
}
