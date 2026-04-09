import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Users, FolderArchive, Shield, Wrench, ArrowLeft } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function AdminLayout() {
  const { isAdmin } = useAuth();
  const location = useLocation();

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  if (location.pathname === '/admin') {
    return <Navigate to="/admin/members" replace />;
  }

  return <Outlet />;
}
