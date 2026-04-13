import { useEffect, useState, useRef } from 'react';
import { TNexusLogo } from '@/components/TNexusLogo';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Users, Mail, LogIn, KeyRound, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TurnstileWidget, type TurnstileWidgetRef } from '@/components/TurnstileWidget';
import { lovable } from '@/integrations/lovable/index';
import { vi as viLocale, enUS } from 'date-fns/locale';
import { PolicyCheckbox, BlockPopupOverlay, type BlockPopup, loginSchema } from '@/components/auth/shared';

export function LoginForm() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEmailVerified = searchParams.get('verified') === 'true';
  const { signIn, signOut, user, profile, isLoading: authLoading, maintenanceMode, isAdmin } = useAuth();
  const { translations, locale, localizedPath } = useLanguage();
  const ta = translations.auth;
  const dateLocale = locale === 'vi' ? viLocale : enUS;
  const localizedPolicyPath = localizedPath('/guide/terms');
  const localizedPrivacyPath = localizedPath('/guide/privacy');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'login' | 'forgot'>('login');

  const [forgotEmailInput, setForgotEmailInput] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStep, setForgotStep] = useState<'input' | 'otp' | 'newpass' | 'done'>('input');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetRef>(null);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginPolicyAgreed, setLoginPolicyAgreed] = useState(true);
  const [rememberLogin, setRememberLogin] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [blockPopup, setBlockPopup] = useState<BlockPopup>(null);
  const pendingLoginRef = useRef(false);

  useEffect(() => {
    if (user && profile) {
      if (profile.is_approved) {
        if (pendingLoginRef.current) return;
        if (maintenanceMode && !isAdmin) return;
        navigate('/dashboard');
      }
    }
  }, [user, profile, navigate, maintenanceMode, isAdmin]);

  // If logged in but not approved
  if (user && profile && !profile.is_approved) {
    return (
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <TNexusLogo variant="text" width={120} />
          <span className="font-heading font-semibold text-primary flex items-center gap-1">
            <Users className="w-4 h-4" /> T-Nexus
          </span>
        </div>
        <Card className="w-full shadow-card-lg border-border/50">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-heading font-semibold">{ta.pendingTitle}</h2>
            <p className="text-sm text-muted-foreground">{ta.pendingDesc}</p>
            <div className="bg-muted/50 rounded-lg p-3 text-left text-sm space-y-1">
              <p><span className="text-muted-foreground">{ta.pendingFullName}</span> <span className="font-medium">{profile.full_name}</span></p>
              <p><span className="text-muted-foreground">{ta.pendingStudentId}</span> <span className="font-medium">{profile.student_id}</span></p>
              <p><span className="text-muted-foreground">{ta.pendingEmail}</span> <span className="font-medium">{profile.email}</span></p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await supabase.auth.signOut({ scope: 'local' });
                window.location.reload();
              }}
            >
              {ta.pendingLogout}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!loginPolicyAgreed) {
      setErrors({ policy: ta.policyRequired });
      return;
    }

    if (!turnstileToken) {
      toast({ title: ta.captchaVerifying, variant: 'destructive' });
      return;
    }

    const result = loginSchema(ta).safeParse({ identifier, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const input = identifier.trim();

    try {
      const { data: captchaResult, error: captchaError } = await supabase.functions.invoke('verify-turnstile', {
        body: { token: turnstileToken },
      });
      if (captchaError || !captchaResult?.success) {
        setIsLoading(false);
        setTurnstileToken(null);
        turnstileRef.current?.reset();
        toast({ title: ta.captchaFailed, variant: 'destructive' });
        return;
      }
      setTurnstileToken(null);
      turnstileRef.current?.reset();

      let loginEmail = input;
      pendingLoginRef.current = true;
      sessionStorage.setItem('t-nexus_login_in_progress', 'true');

      const { error } = await signIn(loginEmail, password);

      if (error) {
        const errMsg = error.message?.toLowerCase() || '';
        if (errMsg.includes('email not confirmed') || errMsg.includes('email_not_confirmed')) {
          try {
            const { data: resumeData } = await supabase.functions.invoke('signup-email-otp', {
              body: { action: 'resume_verification', email: loginEmail.toLowerCase() },
            });

            if (resumeData?.success) {
              pendingLoginRef.current = false;
              sessionStorage.removeItem('t-nexus_login_in_progress');
              setIsLoading(false);
              // Navigate to register with resume verify params
              navigate(`/register?resume_verify=true&email=${encodeURIComponent(resumeData.email)}&user_id=${resumeData.user_id}&full_name=${encodeURIComponent(resumeData.full_name || '')}&student_id=${encodeURIComponent(resumeData.student_id || '')}`);
              toast({
                title: 'Email chưa xác minh',
                description: 'Đã gửi mã OTP đến email của bạn để xác minh tài khoản.',
              });
              return;
            }
          } catch (resumeErr) {
            console.warn('Resume verification failed:', resumeErr);
          }
        }

        pendingLoginRef.current = false;
        sessionStorage.removeItem('t-nexus_login_in_progress');
        setIsLoading(false);
        toast({
          title: ta.toastLoginFailed,
          description: ta.toastInvalidCredentials,
          variant: 'destructive',
        });
      } else {
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) throw new Error('no user');

          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', currentUser.id);
          const isUserAdmin = userRoles?.some(r => r.role === 'system:owner') ?? false;

          const { data: freshProfile } = await supabase
            .from('profiles')
            .select('is_approved, suspended_until, suspension_reason')
            .eq('id', currentUser.id)
            .maybeSingle();

          if (freshProfile && !freshProfile.is_approved) {
            pendingLoginRef.current = false;
            sessionStorage.removeItem('t-nexus_login_in_progress');
            setIsLoading(false);
            toast({
              title: ta.toastPendingApproval,
              description: ta.toastPendingApprovalDesc,
            });
            await signOut();
            return;
          }

          const isSuspended = freshProfile?.suspended_until
            ? new Date(freshProfile.suspended_until).getTime() > Date.now()
            : false;

          const { data: maintenanceData } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'maintenance_mode')
            .maybeSingle();
          const maintenanceVal = maintenanceData?.value as { enabled?: boolean; message?: string; end_at?: string } | null;
          const isMaintenanceOn = maintenanceVal?.enabled ?? false;

          if (isSuspended) {
            pendingLoginRef.current = false;
            sessionStorage.removeItem('t-nexus_login_in_progress');
            setIsLoading(false);
            setBlockPopup({
              type: 'suspended',
              until: freshProfile?.suspended_until,
              reason: freshProfile?.suspension_reason,
            });
            await signOut();
            return;
          }

          if (isMaintenanceOn && !isUserAdmin) {
            pendingLoginRef.current = false;
            sessionStorage.removeItem('t-nexus_login_in_progress');
            setIsLoading(false);
            setBlockPopup({
              type: 'maintenance',
              message: maintenanceVal?.message,
              endAt: maintenanceVal?.end_at,
            });
            await signOut();
            return;
          }
        } catch (checkErr) {
          console.warn('Post-login check error:', checkErr);
        }

        setIsLoading(false);
        if (rememberLogin) {
          localStorage.setItem('t-nexus_remember_login', 'true');
        } else {
          localStorage.removeItem('t-nexus_remember_login');
        }
        pendingLoginRef.current = false;
        sessionStorage.removeItem('t-nexus_login_in_progress');
        toast({ title: ta.toastLoginSuccess, description: ta.toastWelcomeBack });

        const postLoginRedirect = sessionStorage.getItem('t-nexus_post_login_redirect');
        if (postLoginRedirect) {
          sessionStorage.removeItem('t-nexus_post_login_redirect');
          navigate(postLoginRedirect);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      pendingLoginRef.current = false;
      sessionStorage.removeItem('t-nexus_login_in_progress');
      setIsLoading(false);
      toast({ title: 'Lỗi hệ thống', description: 'Có lỗi xảy ra. Vui lòng thử lại sau.', variant: 'destructive' });
    }
  };

  // Show verified success screen
  if (isEmailVerified) {
    return (
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-4 flex flex-col items-center gap-1">
          <TNexusLogo variant="text" width={100} />
          <span className="font-heading text-sm font-semibold text-primary flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> T-Nexus
          </span>
        </div>
        <Card className="w-full shadow-card-lg border-emerald-300 dark:border-emerald-700/50">
          <CardContent className="py-5 px-4 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <div>
              <h2 className="text-base font-heading font-bold text-emerald-600 dark:text-emerald-400">{ta.emailVerifiedTitle}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{ta.emailVerifiedDesc}</p>
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                searchParams.delete('verified');
                setSearchParams(searchParams, { replace: true });
              }}
            >
              {ta.emailVerifiedBtn}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <TNexusLogo variant="text" width={120} />
          <span className="font-heading font-semibold text-primary flex items-center gap-1">
            <Users className="w-4 h-4" /> {ta.memberBrand}
          </span>
        </div>
        <Card className="w-full shadow-card-lg border-border/50">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg font-heading">
              {activeTab === 'login' ? ta.tabLogin : ta.tabForgot}
            </CardTitle>
            <CardDescription>
              {activeTab === 'login'
                ? ta.loginDesc
                : forgotStep === 'done'
                  ? ta.forgotDoneDesc
                  : forgotStep === 'newpass'
                    ? ta.forgotNewPassDesc
                    : forgotStep === 'otp'
                      ? ta.forgotOtpDesc
                      : ta.forgotDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeTab === 'login' ? (
              <div className="space-y-4">
                <form onSubmit={handleLogin} data-auth-form="login" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-identifier">{ta.identifierLabel}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-identifier"
                      type="email"
                      placeholder={ta.identifierPlaceholder}
                      className="pl-10"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                  {errors.identifier && <p className="text-sm text-destructive">{errors.identifier}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{ta.passwordLabel}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder={ta.passwordPlaceholder}
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-xs font-medium text-foreground hover:underline"
                      onClick={() => { setActiveTab('forgot'); setForgotStep('input'); setErrors({}); }}
                    >
                      {ta.forgotPasswordLink}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-login"
                    checked={rememberLogin}
                    onCheckedChange={(v) => setRememberLogin(v === true)}
                    className="shrink-0 h-3.5 w-3.5 rounded-full border border-muted-foreground/40 data-[state=checked]:border-primary data-[state=checked]:bg-transparent transition-all duration-200 [&_svg]:h-3 [&_svg]:w-3 [&_svg]:text-primary"
                  />
                  <label htmlFor="remember-login" className="text-xs text-muted-foreground cursor-pointer select-none">
                    {ta.rememberLogin}
                  </label>
                </div>

                <PolicyCheckbox
                  checked={loginPolicyAgreed}
                  onCheckedChange={setLoginPolicyAgreed}
                  error={errors.policy}
                  ta={ta}
                  localizedPolicyPath={localizedPolicyPath}
                  localizedPrivacyPath={localizedPrivacyPath}
                />

                <TurnstileWidget
                  ref={turnstileRef}
                  onVerify={(token) => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => {
                    setTurnstileToken(null);
                    toast({ title: ta.captchaFailed, variant: 'destructive' });
                  }}
                />

                <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {ta.loggingIn || 'Đang đăng nhập...'}
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      {ta.loginBtn}
                    </>
                  )}
                </Button>
              </form>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">{ta.orDivider}</span>
                  </div>
                </div>

                {/* Google Login Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full font-semibold"
                  disabled={googleLoading || isLoading}
                  onClick={async () => {
                    setGoogleLoading(true);
                    try {
                      const result = await lovable.auth.signInWithOAuth("google", {
                        redirect_uri: window.location.origin + '/login',
                        extraParams: {
                          prompt: "select_account",
                        },
                      });
                      if (result.error) {
                        toast({ title: ta.toastLoginFailed, description: String(result.error), variant: 'destructive' });
                        setGoogleLoading(false);
                      }
                      if (result.redirected) return;
                      setGoogleLoading(false);
                    } catch (err: any) {
                      setGoogleLoading(false);
                      toast({ title: ta.toastLoginFailed, description: err?.message || 'Google login failed', variant: 'destructive' });
                    }
                  }}
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {ta.googleLoginLoading}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      {ta.googleLoginBtn}
                    </>
                  )}
                </Button>

                <p className="text-sm text-center text-muted-foreground">
                  {ta.noAccount}{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => navigate('/register')}
                  >
                    {ta.registerNow}
                  </button>
                </p>
              </div>
            ) : (
              /* Forgot password flow */
              <div className="space-y-4">
                {forgotStep === 'done' ? (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-heading font-semibold text-emerald-700 dark:text-emerald-400">{ta.forgotResetSuccess}</h3>
                    <p className="text-sm text-muted-foreground">{ta.forgotResetSuccessDesc}</p>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setActiveTab('login');
                        setForgotStep('input');
                        setForgotEmailInput('');
                        setForgotEmail('');
                        setOtpCode('');
                        setNewPassword('');
                        setNewPasswordConfirm('');
                        setErrors({});
                      }}
                    >
                      {ta.forgotLoginNow}
                    </Button>
                  </div>
                ) : forgotStep === 'newpass' ? (
                  <form onSubmit={async (e) => {
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
                    setForgotLoading(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('password-reset-otp', {
                        body: { action: 'reset_password', email: forgotEmail, code: otpCode, new_password: newPassword },
                      });
                      setForgotLoading(false);
                      if (error || !data?.success) {
                        toast({ title: ta.forgotOtpError, description: data?.error || ta.forgotResetError, variant: 'destructive' });
                      } else {
                        setForgotStep('done');
                      }
                    } catch {
                      setForgotLoading(false);
                      toast({ title: 'Lỗi hệ thống', description: 'Có lỗi xảy ra.', variant: 'destructive' });
                    }
                  }} className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                      {ta.forgotNewPassForAccount} <span className="font-medium text-foreground">{forgotEmail}</span>
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="new-pass">{ta.forgotNewPassword}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="new-pass" type="password" placeholder={ta.forgotNewPassPlaceholder} className="pl-10" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={forgotLoading} autoFocus />
                      </div>
                      {errors.newPass && <p className="text-sm text-destructive">{errors.newPass}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-pass-confirm">{ta.forgotConfirmLabel}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="new-pass-confirm" type="password" placeholder={ta.forgotConfirmNewPlaceholder} className="pl-10" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} disabled={forgotLoading} />
                      </div>
                      {errors.newPassConfirm && <p className="text-sm text-destructive">{errors.newPassConfirm}</p>}
                    </div>
                    <Button type="submit" className="w-full font-semibold" disabled={forgotLoading}>
                      {forgotLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                      {ta.forgotResetButton}
                    </Button>
                    <p className="text-sm text-center">
                      <button type="button" className="text-primary hover:underline font-medium" onClick={() => { setForgotStep('otp'); setNewPassword(''); setNewPasswordConfirm(''); }}>
                        ← {ta.forgotBackToLogin}
                      </button>
                    </p>
                  </form>
                ) : forgotStep === 'otp' ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                      {ta.forgotOtpDesc} <span className="font-medium text-foreground">{forgotEmail}</span>
                    </p>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={otpCode}
                        onChange={(val) => {
                          setOtpCode(val);
                          setErrors({});
                        }}
                        disabled={forgotLoading}
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
                      disabled={forgotLoading || otpCode.length !== 6}
                      onClick={async () => {
                        setForgotLoading(true);
                        setErrors({});
                        try {
                          const { data, error } = await supabase.functions.invoke('password-reset-otp', {
                            body: { action: 'verify_code', email: forgotEmail, code: otpCode },
                          });
                          setForgotLoading(false);
                          if (error || !data?.success) {
                            setErrors({ otp: data?.error || ta.forgotOtpIncorrect });
                            setOtpCode('');
                          } else {
                            setForgotStep('newpass');
                          }
                        } catch {
                          setForgotLoading(false);
                          setErrors({ otp: ta.toastGenericError });
                        }
                      }}
                    >
                      {forgotLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {ta.forgotVerify}
                    </Button>
                    <p className="text-sm text-center">
                      <button type="button" className="text-primary hover:underline font-medium" onClick={() => { setForgotStep('input'); setOtpCode(''); setErrors({}); }}>
                        ← {ta.forgotBackToLogin}
                      </button>
                    </p>
                  </div>
                ) : (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setErrors({});
                    const emailInput = forgotEmailInput.trim();
                    if (!emailInput) {
                      setErrors(prev => ({ ...prev, forgotEmail: ta.forgotEmailRequiredError }));
                      return;
                    }
                    setForgotLoading(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('password-reset-otp', {
                        body: { action: 'send_code', email: emailInput },
                      });
                      setForgotLoading(false);
                      if (error || !data?.success) {
                        toast({ title: ta.forgotOtpError, description: data?.error || ta.forgotCannotSendOtp, variant: 'destructive' });
                      } else {
                        setForgotEmail(emailInput);
                        setForgotStep('otp');
                        toast({ title: ta.forgotOtpSentToast, description: ta.forgotOtpSentToastDesc });
                      }
                    } catch {
                      setForgotLoading(false);
                      toast({ title: 'Lỗi hệ thống', description: 'Có lỗi xảy ra.', variant: 'destructive' });
                    }
                  }} className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">{ta.forgotEnterDesc}</p>
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">{ta.forgotEmailLabel}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="forgot-email" type="email" placeholder="email@example.com" className="pl-10" value={forgotEmailInput} onChange={(e) => setForgotEmailInput(e.target.value)} disabled={forgotLoading} autoFocus />
                      </div>
                      {errors.forgotEmail && <p className="text-sm text-destructive">{errors.forgotEmail}</p>}
                    </div>
                    <Button type="submit" className="w-full font-semibold bg-foreground text-background hover:bg-foreground/90" disabled={forgotLoading}>
                      {forgotLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                      {ta.forgotSendButton}
                    </Button>
                    <p className="text-sm text-center">
                      <button type="button" className="text-primary hover:underline font-medium" onClick={() => { setActiveTab('login'); setErrors({}); setForgotEmailInput(''); }}>
                        {ta.forgotBackToLogin}
                      </button>
                    </p>
                  </form>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {blockPopup && (
        <BlockPopupOverlay
          blockPopup={blockPopup}
          onClose={() => setBlockPopup(null)}
          ta={ta}
          dateLocale={dateLocale}
        />
      )}
    </>
  );
}
