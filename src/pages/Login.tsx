import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { LoginForm } from '@/components/LoginForm';
import RememberLoginScreen from '@/components/RememberLoginScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

export default function Login() {
  const { user, profile, roles, isLoading: authLoading, signOut, maintenanceMode, isAdmin } = useAuth();
  const { translations: t, localizedPath: lp } = useLanguage();

  // Prefetch Dashboard chunk while user is on login page
  useEffect(() => {
    const timer = setTimeout(() => {
      import('../pages/Dashboard');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (authLoading) return null;

  const isBlockedByMaintenance = maintenanceMode && !isAdmin;
  const hasRememberFlag = localStorage.getItem('t-nexus_remember_login') === 'true';
  const isSignupOtpFlow = sessionStorage.getItem('t-nexus_signup_otp_flow') === 'true';
  const isLoginInProgress = sessionStorage.getItem('t-nexus_login_in_progress') === 'true';

  if (user && profile && profile.is_approved && hasRememberFlag && !isSignupOtpFlow && !isBlockedByMaintenance && !isLoginInProgress) {
    return (
      <RememberLoginScreen
        profile={profile}
        roles={roles}
        onLogout={async () => {
          await signOut();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={lp('/')}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.auth.backHome}
            </Button>
          </Link>
          <span className="hidden sm:inline font-heading text-sm text-muted-foreground">
            T-Nexus
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto flex flex-col items-center justify-start sm:justify-center p-4 gap-4">
        <LoginForm />
      </main>

      <footer className="border-t py-4 text-center text-sm text-muted-foreground bg-card">
        <div className="flex items-center justify-center gap-4">
          <span>{t.auth.footerCopyright}</span>
          <LanguageToggle />
        </div>
      </footer>
    </div>
  );
}
