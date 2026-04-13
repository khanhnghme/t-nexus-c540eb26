import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { TNexusLogo } from '@/components/TNexusLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import LanguageToggle from '@/components/LanguageToggle';

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { translations, localizedPath: lp } = useLanguage();
  const ta = translations.auth;
  const { toast } = useToast();

  const email = (location.state as any)?.email as string | undefined;

  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password', { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (!email) return null;

  const handleVerify = async () => {
    setLoading(true);
    setErrors({});
    try {
      const { data, error } = await supabase.functions.invoke('password-reset-otp', {
        body: { action: 'verify_code', email, code: otpCode },
      });
      setLoading(false);
      if (error || !data?.success) {
        setErrors({ otp: data?.error || ta.forgotOtpIncorrect });
        setOtpCode('');
      } else {
        sessionStorage.setItem('pw_reset_verified', JSON.stringify({ email, code: otpCode, ts: Date.now() }));
        navigate('/reset-password-new', { replace: true });
      }
    } catch {
      setLoading(false);
      setErrors({ otp: ta.toastGenericError });
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('password-reset-otp', {
        body: { action: 'send_code', email },
      });
      setLoading(false);
      if (error || !data?.success) {
        toast({ title: ta.forgotOtpError, description: data?.error || ta.forgotCannotSendOtp, variant: 'destructive' });
      } else {
        toast({ title: ta.forgotOtpSentToast, description: ta.forgotOtpSentToastDesc });
        setResendCooldown(60);
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
              <CardDescription>{ta.forgotOtpDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  {ta.forgotOtpDesc} <span className="font-medium text-foreground">{email}</span>
                </p>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(val) => { setOtpCode(val); setErrors({}); }}
                    disabled={loading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {errors.otp && <p className="text-sm text-destructive text-center">{errors.otp}</p>}
                <Button
                  className="w-full font-semibold"
                  disabled={loading || otpCode.length !== 6}
                  onClick={handleVerify}
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {ta.forgotVerify}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-primary disabled:opacity-50"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleResend}
                  >
                    {resendCooldown > 0
                      ? `${ta.forgotSendButton} (${resendCooldown}s)`
                      : ta.forgotSendButton}
                  </button>
                </div>

                <p className="text-sm text-center">
                  <button type="button" className="text-primary hover:underline font-medium" onClick={() => navigate('/forgot-password')}>
                    ← {ta.forgotBackToLogin}
                  </button>
                </p>
              </div>
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
