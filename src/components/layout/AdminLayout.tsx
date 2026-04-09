import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
