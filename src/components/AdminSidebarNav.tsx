import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Users, FolderArchive, Shield, Wrench, ArrowLeft } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AdminSidebarNavProps {
  collapsed?: boolean;
}

export default function AdminSidebarNav({ collapsed }: AdminSidebarNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { translations } = useLanguage();
  const t = translations.app?.sidebar;

  const adminItems = [
    { name: t?.systemMembers || 'Members', href: '/admin/members', icon: Users },
    { name: t?.backup || 'Backup', href: '/admin/backup', icon: FolderArchive },
    { name: t?.admin || 'System', href: '/admin/system', icon: Shield },
    { name: t?.utilities || 'Utilities', href: '/admin/utilities', icon: Wrench },
  ];

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  if (collapsed) {
    return (
      <div className="tree-nav">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate('/dashboard')}
              className="sidebar-nav-item"
            >
              <ArrowLeft className="nav-icon" strokeWidth={1.8} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            <p className="font-medium">{t?.backToDashboard || 'Back'}</p>
          </TooltipContent>
        </Tooltip>

        <div className="sidebar-nav-separator" />

        {adminItems.map(item => (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
              <Link to={item.href} className={cn('sidebar-nav-item', isActive(item.href) && 'active')}>
                <item.icon className="nav-icon" strokeWidth={1.8} />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              <p className="font-medium">{item.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  }

  return (
    <div className="tree-nav">
      <button
        onClick={() => navigate('/dashboard')}
        className="sidebar-nav-item w-full text-left group"
      >
        <ArrowLeft className="nav-icon" strokeWidth={1.8} />
        <span className="nav-label">{t?.backToDashboard || 'Back'}</span>
      </button>

      <div className="sidebar-nav-separator" />
      <div className="sidebar-section-label">{t?.system || 'ADMIN'}</div>

      {adminItems.map(item => (
        <Link
          key={item.href}
          to={item.href}
          className={cn('sidebar-nav-item', isActive(item.href) && 'active')}
        >
          <item.icon className="nav-icon" strokeWidth={1.8} />
          <span className="nav-label">{item.name}</span>
        </Link>
      ))}
    </div>
  );
}
