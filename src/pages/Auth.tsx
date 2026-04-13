import { Navigate } from 'react-router-dom';

// Legacy route: redirect /auth → /login
export default function Auth() {
  return <Navigate to="/login" replace />;
}
