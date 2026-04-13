import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { TNexusLogo } from '@/components/TNexusLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, KeyRound, Users, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import LanguageToggle from '@/components/LanguageToggle';

export default function ResetPasswordNew() {
  const navigate = useNavigate();
  const { translations, localizedPath: lp } = useLanguage();
  const ta = translations.auth;
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verified, setVerified] = useState<{ email: string; code: string } | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('pw_reset_verified');
    if (!raw) {
      navigate('/forgot-password', { replace: true });
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts > 15 * 60 * 1000) {
        sessionStorage.removeItem('pw_reset_verified');
        navigate('/forgot-password', { replace: true });
        return;
      }
      setVerified({ email: parsed.email, code: parsed.code });
    } catch {
      sessionStorage.removeItem('pw_reset_verified');
      navigate('/forgot-password', { replace: true });
    }
  }, [navigate]);

  if (!verified) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!newPassword || newPassword.length < 6) {
      setErrors({ newPass: ta.valPasswordMinForgot });
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setErrors({ newPassConfirm: ta.valPasswordMismatchForgot });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('password-reset-otp', {
        body: { action: 'reset_password', email: verified.email, code: verified.code, new_password: newPassword },
      });
      setLoading(false);
      if (error || !data?.success) {
        toast({ title: ta.forgotOtpError, description: data?.error || ta.forgotResetError, variant: 'destructive' });
      } else {
        sessionStorage.removeItem('pw_reset_verified');
        navigate('/password-success', { replace: true });
      }
    } catch {
      setLoading(false);
      toast({ title: 'Lỗi hệ thống', description: 'Có lỗi xảy ra.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={lp('/')}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {ta.backHome}
            </Button>
          </Link>
          <span className="hidden sm:inline font-heading text-sm text-muted-foreground">T-Nexus</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto flex flex-col items-center justify-start sm:justify-center p-4 gap-4">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center gap-2">
            <TNexusLogo variant="text" width={120} />
            <span className="font-heading font-semibold text-primary flex items-center gap-1">
              <Users className="w-4 h-4" /> {ta.memberBrand}
            </span>
          </div>
          <Card className="w-full shadow-card-lg border-border/50">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg font-heading">{ta.tabForgot}</CardTitle>
              <CardDescription>{ta.forgotNewPassDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  {ta.forgotNewPassForAccount} <span className="font-medium text-foreground">{verified.email}</span>
                </p>
                <div className="space-y-2">
                  <Label htmlFor="new-pass">{ta.forgotNewPassword}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="new-pass" type="password" placeholder={ta.forgotNewPassPlaceholder} className="pl-10" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={loading} autoFocus />
                  </div>
                  {errors.newPass && <p className="text-sm text-destructive">{errors.newPass}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-pass-confirm">{ta.forgotConfirmLabel}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="new-pass-confirm" type="password" placeholder={ta.forgotConfirmNewPlaceholder} className="pl-10" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} disabled={loading} />
                  </div>
                  {errors.newPassConfirm && <p className="text-sm text-destructive">{errors.newPassConfirm}</p>}
                </div>
                <Button type="submit" className="w-full font-semibold" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                  {ta.forgotResetButton}
                </Button>
                <p className="text-sm text-center">
                  <button type="button" className="text-primary hover:underline font-medium" onClick={() => navigate('/forgot-password')}>
                    ← {ta.forgotBackToLogin}
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t py-4 text-center text-sm text-muted-foreground bg-card">
        <div className="flex items-center justify-center gap-4">
          <span>{ta.footerCopyright}</span>
          <LanguageToggle />
        </div>
      </footer>
    </div>
  );
}
