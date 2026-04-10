import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { AuthForm } from '@/components/AuthForm';
import RememberLoginScreen from '@/components/RememberLoginScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

import LanguageToggle from '@/components/LanguageToggle';

export default function Auth() {
  const { user, profile, roles, isLoading: authLoading, signOut, maintenanceMode, isAdmin } = useAuth();
  const { translations: t, localizedPath: lp } = useLanguage();

  if (authLoading) return null;

  // During maintenance, non-admin users should NOT see RememberLoginScreen.
  // NOTE: We do NOT call signOut() here because during a fresh login, roles
  // haven't loaded yet so isAdmin is briefly false even for admins.
  // The actual sign-out for non-admin is handled in MemberAuthForm.handleLogin
  // which queries roles directly from supabase (no race condition).
  const isBlockedByMaintenance = maintenanceMode && !isAdmin;

  const hasRememberFlag = localStorage.getItem('t-nexus_remember_login') === 'true';
  const isSignupOtpFlow = sessionStorage.getItem('t-nexus_signup_otp_flow') === 'true';
  const isLoginInProgress = sessionStorage.getItem('t-nexus_login_in_progress') === 'true';

  // Only show RememberLoginScreen if:
  // - NOT blocked by maintenance
  // - NOT in the middle of a fresh login (handleLogin still running post-checks)
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
      {/* Header */}
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

      {/* Main */}
      <main className="flex-1 overflow-y-auto flex flex-col items-center justify-start sm:justify-center p-4 gap-4">
        <AuthForm />
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-sm text-muted-foreground bg-card">
        <div className="flex items-center justify-center gap-4">
          <span>{t.auth.footerCopyright}</span>
          <LanguageToggle />
        </div>
      </footer>
    </div>
  );
}