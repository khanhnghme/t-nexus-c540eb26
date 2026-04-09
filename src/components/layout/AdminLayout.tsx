import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Users, FolderArchive, Shield, Wrench, ArrowLeft } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function AdminLayout() {
  const { isAdmin } = useAuth();
  const { translations } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const t = translations.app?.sidebar;

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const adminItems = [
    { name: t?.systemMembers || 'Members', href: '/admin/members', icon: Users },
    { name: t?.backup || 'Backup', href: '/admin/backup', icon: FolderArchive },
    { name: t?.admin || 'System', href: '/admin/system', icon: Shield },
    { name: t?.utilities || 'Utilities', href: '/admin/utilities', icon: Wrench },
  ];

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  // Redirect /admin to first item
  if (location.pathname === '/admin') {
    return <Navigate to="/admin/members" replace />;
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Secondary sidebar */}
      <div className="admin-secondary-sidebar">
        <div className="admin-sidebar-header">
          <button
            onClick={() => navigate('/dashboard')}
            className="admin-sidebar-back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t?.backToDashboard || 'Back'}</span>
          </button>
          <div className="admin-sidebar-title">
            {t?.system || 'ADMIN'}
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {adminItems.map(item => (
            <Link
              key={item.href}
              to={item.href}
              className={cn('admin-sidebar-item', isActive(item.href) && 'active')}
            >
              <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Content area */}
      <div className="admin-content-area">
        <Outlet />
      </div>
    </div>
  );
}
