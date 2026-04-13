import { useEffect, useState, useRef } from 'react';
import { TNexusLogo } from '@/components/TNexusLogo';
import { OtpVerifyScreen } from '@/components/OtpVerifyScreen';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Users, Mail, User, UserPlus, GraduationCap, Check, ChevronsUpDown, CheckCircle2, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { INSTITUTIONS, REGIONS, searchInstitutions } from '@/lib/institutions';
import { cn } from '@/lib/utils';
import { TurnstileWidget, type TurnstileWidgetRef } from '@/components/TurnstileWidget';
import { PolicyCheckbox, registerSchema } from '@/components/auth/shared';

export function RegisterForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, isLoading: authLoading, maintenanceMode, isAdmin } = useAuth();
  const { translations, locale, localizedPath } = useLanguage();
  const ta = translations.auth;
  const localizedPolicyPath = localizedPath('/guide/terms');
  const localizedPrivacyPath = localizedPath('/guide/privacy');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [registerSuccess, setRegisterSuccess] = useState<false | 'pending' | 'approved' | 'verify_email'>(false);
  const isRegisteringRef = useRef(false);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetRef>(null);

  // Register fields
  const [regStudentId, setRegStudentId] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regInstitution, setRegInstitution] = useState('');
  const [regInstitutionOpen, setRegInstitutionOpen] = useState(false);
  const [regInstitutionSearch, setRegInstitutionSearch] = useState('');
  const [regCustomInstitution, setRegCustomInstitution] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUserId, setRegUserId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPolicyAgreed, setRegPolicyAgreed] = useState(false);

  // Handle resume verification from login redirect
  useEffect(() => {
    const resumeVerify = searchParams.get('resume_verify');
    if (resumeVerify === 'true') {
      const email = searchParams.get('email') || '';
      const userId = searchParams.get('user_id') || '';
      const fullName = searchParams.get('full_name') || '';
      const studentId = searchParams.get('student_id') || '';
      setRegEmail(email);
      setRegUserId(userId);
      setRegFullName(fullName);
      setRegStudentId(studentId);
      setRegisterSuccess('verify_email');
    }
  }, [searchParams]);

  // Redirect if already logged in and approved
  useEffect(() => {
    if (user && profile && profile.is_approved && !isRegisteringRef.current) {
      if (maintenanceMode && !isAdmin) return;
      navigate('/dashboard');
    }
  }, [user, profile, navigate, maintenanceMode, isAdmin]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!regPolicyAgreed) {
      setErrors({ policy: ta.policyRequiredRegister });
      return;
    }

    if (!turnstileToken) {
      toast({ title: ta.captchaVerifying, variant: 'destructive' });
      return;
    }

    const result = registerSchema(ta).safeParse({
      studentId: regStudentId,
      fullName: regFullName,
      institution: regInstitution === '__other__' ? regCustomInstitution : regInstitution,
      email: regEmail,
      password: regPassword,
      confirmPassword: regConfirmPassword,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

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

      isRegisteringRef.current = true;
      const { data: registerData, error: registerError } = await supabase.functions.invoke('signup-email-otp', {
        body: {
          action: 'register',
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
          student_id: regStudentId.trim(),
          full_name: regFullName.trim(),
          institution: regInstitution === '__other__' ? regCustomInstitution.trim() : regInstitution,
        },
      });

      if (registerError || !registerData?.success) {
        isRegisteringRef.current = false;
        setIsLoading(false);
        const errMsg = registerData?.error || registerError?.message || ta.toastRegisterFailed;
        if (errMsg.includes('Email')) {
          toast({ title: ta.toastEmailAlreadyExists, description: errMsg, variant: 'destructive' });
        } else {
          toast({ title: ta.toastRegisterFailed, description: errMsg, variant: 'destructive' });
        }
      } else {
        if (registerData.resume) {
          setRegUserId(registerData.user_id);
          setIsLoading(false);
          setRegisterSuccess('verify_email');
          toast({
            title: ta.toastCheckEmail || 'Kiểm tra email',
            description: 'Tài khoản đã tồn tại nhưng chưa xác minh. Đã gửi lại mã OTP.',
          });
        } else {
          setRegUserId(registerData.user_id);
          setIsLoading(false);
          setRegisterSuccess('verify_email');
          toast({
            title: ta.toastCheckEmail,
            description: ta.toastOtpSent,
          });
        }
      }
    } catch (err) {
      isRegisteringRef.current = false;
      setIsLoading(false);
      toast({ title: 'Lỗi hệ thống', description: 'Có lỗi xảy ra. Vui lòng thử lại sau.', variant: 'destructive' });
    }
  };

  if (registerSuccess) {
    const isApproved = registerSuccess === 'approved';
    const isVerifyEmail = registerSuccess === 'verify_email';
    return (
      <div className={`w-full max-w-sm mx-auto`}>
        <div className="mb-4 flex flex-col items-center gap-1">
          <TNexusLogo variant="text" width={100} />
          <span className="font-heading text-sm font-semibold text-primary flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> T-Nexus
          </span>
        </div>
        <Card className={`w-full shadow-card-lg ${isVerifyEmail ? 'border-blue-300 dark:border-blue-700/50' : isApproved ? 'border-emerald-300 dark:border-emerald-700/50' : 'border-amber-300 dark:border-amber-700/50'}`}>
          <CardContent className={`${isVerifyEmail ? 'p-0' : 'py-5 px-4 text-center space-y-3'}`}>
            {isVerifyEmail ? (
              <OtpVerifyScreen
                email={regEmail}
                userId={regUserId}
                fullName={regFullName}
                studentId={regStudentId}
                onVerified={() => {
                  setRegisterSuccess(false);
                  navigate('/login?verified=true');
                }}
                onBack={() => {
                  setRegisterSuccess(false);
                }}
              />
            ) : isApproved ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <div>
                  <h2 className="text-base font-heading font-bold text-emerald-600 dark:text-emerald-400">{ta.registerSuccessTitle}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{ta.registerAutoApproved}</p>
                </div>
                <div className="bg-muted/50 rounded-md p-2 text-left text-xs space-y-0.5">
                  <p><span className="text-muted-foreground">{ta.pendingStudentId}</span> <span className="font-medium">{regStudentId}</span></p>
                  <p><span className="text-muted-foreground">{ta.pendingFullName}</span> <span className="font-medium">{regFullName}</span></p>
                  <p><span className="text-muted-foreground">{ta.pendingEmail}</span> <span className="font-medium">{regEmail}</span></p>
                </div>
              </>
            ) : (
              <>
                <UserPlus className="w-10 h-10 text-amber-500 mx-auto" />
                <div>
                  <h2 className="text-base font-heading font-bold">{ta.registerSuccessTitle}</h2>
                  <div className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-medium mt-0.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> {ta.registerPendingAdmin}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-md p-2 text-left text-xs space-y-0.5">
                  <p><span className="text-muted-foreground">{ta.pendingStudentId}</span> <span className="font-medium">{regStudentId}</span></p>
                  <p><span className="text-muted-foreground">{ta.pendingFullName}</span> <span className="font-medium">{regFullName}</span></p>
                  <p><span className="text-muted-foreground">{ta.pendingEmail}</span> <span className="font-medium">{regEmail}</span></p>
                </div>
                <p className="text-xs text-muted-foreground">{ta.registerLoginAfterApproval}</p>
              </>
            )}

            <Button
              size="sm"
              variant={isApproved ? 'default' : 'outline'}
              className="w-full"
              onClick={() => {
                setRegisterSuccess(false);
                navigate('/login');
              }}
            >
              {isApproved ? ta.registerLoginNow : ta.registerBackToLogin}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex flex-col items-center gap-2">
        <TNexusLogo variant="text" width={120} />
        <span className="font-heading font-semibold text-primary flex items-center gap-1">
          <Users className="w-4 h-4" /> {ta.memberBrand}
        </span>
      </div>
      <Card className="w-full shadow-card-lg border-border/50">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg font-heading">{ta.tabRegister}</CardTitle>
          <CardDescription>{ta.registerDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} data-auth-form="register" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="reg-full-name">{ta.fullNameLabel} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="reg-full-name"
                  type="text"
                  placeholder={ta.fullNamePlaceholder}
                  className="pl-10"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
            </div>
            <div className="space-y-2">
              <Label>{ta.institutionLabel} <span className="text-destructive">*</span></Label>
              <Popover open={regInstitutionOpen} onOpenChange={setRegInstitutionOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={regInstitutionOpen}
                    className={cn(
                      "w-full justify-between h-10 font-normal",
                      !regInstitution && "text-muted-foreground"
                    )}
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <GraduationCap className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {regInstitution === '__other__'
                          ? (ta.institutionOther || 'Đơn vị đào tạo khác')
                          : regInstitution
                            ? INSTITUTIONS.find(i => i.name === regInstitution)?.name || regInstitution
                            : ta.institutionPlaceholder}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={ta.institutionSearch}
                      value={regInstitutionSearch}
                      onValueChange={setRegInstitutionSearch}
                    />
                    <CommandList>
                      <ScrollArea className="h-[240px]">
                        <CommandEmpty>{ta.institutionEmpty}</CommandEmpty>
                        {(() => {
                          const filtered = searchInstitutions(regInstitutionSearch);
                          const groupedByRegion = new Map<string, typeof filtered>();
                          filtered.forEach(inst => {
                            const arr = groupedByRegion.get(inst.region) || [];
                            arr.push(inst);
                            groupedByRegion.set(inst.region, arr);
                          });
                          return REGIONS.map(region => {
                            const items = groupedByRegion.get(region);
                            if (!items || items.length === 0) return null;
                            return (
                              <CommandGroup key={region} heading={region}>
                                {items.map(inst => (
                                  <CommandItem
                                    key={inst.code}
                                    value={inst.name}
                                    onSelect={() => {
                                      setRegInstitution(inst.name);
                                      setRegInstitutionOpen(false);
                                      setRegInstitutionSearch('');
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", regInstitution === inst.name ? "opacity-100" : "opacity-0")} />
                                    <span className="text-xs font-mono text-muted-foreground mr-1.5">{inst.code}</span>
                                    <span className="truncate">{inst.name}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            );
                          });
                        })()}
                        <CommandGroup heading={ta.institutionOtherGroup || 'Khác'}>
                          <CommandItem
                            value="__other__"
                            onSelect={() => {
                              setRegInstitution('__other__');
                              setRegInstitutionOpen(false);
                              setRegInstitutionSearch('');
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", regInstitution === '__other__' ? "opacity-100" : "opacity-0")} />
                            <span className="truncate">{ta.institutionOther || 'Đơn vị đào tạo khác...'}</span>
                          </CommandItem>
                        </CommandGroup>
                      </ScrollArea>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {regInstitution === '__other__' && (
                <div className="mt-2">
                  <Input
                    placeholder={ta.institutionOtherPlaceholder || 'Nhập tên đơn vị đào tạo...'}
                    value={regCustomInstitution}
                    onChange={(e) => setRegCustomInstitution(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              )}
              {errors.institution && <p className="text-sm text-destructive">{errors.institution}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-student-id">{ta.studentIdLabel}</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="reg-student-id"
                  type="text"
                  placeholder="31241234567"
                  className="pl-10"
                  value={regStudentId}
                  onChange={(e) => setRegStudentId(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              {errors.studentId && <p className="text-sm text-destructive">{errors.studentId}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="email@example.com"
                  className="pl-10"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">{ta.passwordLabel} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="reg-password"
                  type="password"
                  placeholder={ta.passwordMinPlaceholder}
                  className="pl-10"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-confirm-password">{ta.confirmPasswordLabel} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="reg-confirm-password"
                  type="password"
                  placeholder={ta.confirmPasswordPlaceholder}
                  className="pl-10"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
            </div>

            <PolicyCheckbox
              checked={regPolicyAgreed}
              onCheckedChange={setRegPolicyAgreed}
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
                  {ta.registering || 'Đang tạo tài khoản...'}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {ta.registerBtn}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {ta.adminApprovalNote}
            </p>
            <p className="text-sm text-center text-muted-foreground">
              {ta.haveAccount}{' '}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => navigate('/login')}
              >
                {ta.loginNow}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
