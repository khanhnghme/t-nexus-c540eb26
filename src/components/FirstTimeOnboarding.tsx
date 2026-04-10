import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { r2Storage } from '@/lib/r2Storage';
import { useLanguage } from '@/contexts/LanguageContext';
import { PLAN_CONFIG, getPlanLabel as getPlanLabelFromConfig, getWelcomePrice, type PlanKey } from '@/lib/planConfig';
import tNexusTextWhite from '@/assets/t-nexus-text-white.png';
import welcomeImg from '@/assets/onboarding-welcome.png';
import securityImg from '@/assets/onboarding-security.png';
import profileImg from '@/assets/onboarding-profile.png';
import completeImg from '@/assets/onboarding-complete.png';
import {
  Loader2, Key, Camera, User, Check, ChevronRight,
  GraduationCap, BookOpen, Phone, Sparkles, Shield,
  Rocket, Eye, EyeOff, Mail, ListChecks, Users, FolderKanban,
  Award, MessageSquare, ChevronLeft, Globe, Crown, Zap,
  Tag, Plus, Minus, Package, CreditCard, ShieldCheck,
  ArrowRight, ArrowLeft, ChevronUp, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ADDON_TYPES = [
  { type: 'projects', emoji: '📁', unitLabel: '+5 projects', unitLabelVi: '+5 dự án' },
  { type: 'storage', emoji: '💾', unitLabel: '+5 GB storage', unitLabelVi: '+5 GB lưu trữ' },
  { type: 'members', emoji: '👥', unitLabel: '+5 members', unitLabelVi: '+5 thành viên' },
] as const;

const ADDON_PRICE_MONTHLY = 2.49;

const COUPON_ERROR_MAP: Record<string, { en: string; vi: string }> = {
  invalid: { en: 'Invalid coupon code', vi: 'Mã giảm giá không hợp lệ' },
  expired: { en: 'Coupon has expired', vi: 'Mã giảm giá đã hết hạn' },
  not_started: { en: 'Coupon is not yet active', vi: 'Mã giảm giá chưa có hiệu lực' },
  max_uses: { en: 'Coupon usage limit reached', vi: 'Mã giảm giá đã hết lượt sử dụng' },
  not_applicable: { en: 'Coupon not applicable to this plan', vi: 'Mã không áp dụng cho gói này' },
  already_used: { en: 'You have already used this coupon', vi: 'Bạn đã sử dụng mã này rồi' },
  server_error: { en: 'Server error. Please try again.', vi: 'Lỗi hệ thống. Vui lòng thử lại.' },
};

interface FirstTimeOnboardingProps {
  userId: string;
  userFullName: string;
  userEmail: string;
  userStudentId: string;
  userPlan?: string;
  mustChangePassword: boolean;
  onComplete: () => void;
}

type StepId = 'language' | 'welcome' | 'password' | 'info' | 'plan' | 'checkout' | 'finish';

const stepIcons: Record<StepId, React.ReactNode> = {
  language: <Globe className="w-4 h-4" />,
  welcome: <Sparkles className="w-4 h-4" />,
  password: <Key className="w-4 h-4" />,
  info: <User className="w-4 h-4" />,
  plan: <Crown className="w-4 h-4" />,
  checkout: <CreditCard className="w-4 h-4" />,
  finish: <Rocket className="w-4 h-4" />,
};

export default function FirstTimeOnboarding({
  userId, userFullName, userEmail, userStudentId, userPlan, mustChangePassword, onComplete,
}: FirstTimeOnboardingProps) {
  const { toast } = useToast();
  const { translations: { app: appT, pricing: pricingT }, setLocale, locale } = useLanguage();
  const t = appT.onboarding;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isVi = locale === 'vi';

  const [selectedLang, setSelectedLang] = useState<'en' | 'vi' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'plan_free' | 'plan_plus' | 'plan_pro' | 'plan_business'>('plan_free');

  // Checkout state
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [addons, setAddons] = useState<Record<string, number>>({});
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<{ type: string; value: number; code: string } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [checkoutSubStep, setCheckoutSubStep] = useState<1 | 2>(1);
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(true);
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(true);
  const navigate = useNavigate();

  const allSteps: StepId[] = useMemo(() => {
    const base: StepId[] = ['language', 'welcome'];
    if (mustChangePassword) base.push('password');
    base.push('info', 'plan');
    if (selectedPlan !== 'plan_free') base.push('checkout');
    base.push('finish');
    return base;
  }, [mustChangePassword, selectedPlan]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = allSteps[currentStepIndex] ?? 'language';

  // Ensure step index doesn't go out of bounds when steps change
  useEffect(() => {
    if (currentStepIndex >= allSteps.length) {
      setCurrentStepIndex(allSteps.length - 1);
    }
  }, [allSteps.length, currentStepIndex]);

  const [showCelebration, setShowCelebration] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [yearBatch, setYearBatch] = useState('');
  const [major, setMajor] = useState('');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [infoErrors, setInfoErrors] = useState<Record<string, boolean>>({});
  const [editStudentId, setEditStudentId] = useState(userStudentId || '');
  const [editFullName, setEditFullName] = useState(userFullName || '');
  const needsStudentId = !userStudentId || userStudentId.trim() === '';
  const needsFullName = !userFullName || userFullName.trim() === '';

  // Load PayPal config when checkout step is possible
  useEffect(() => {
    if (selectedPlan !== 'plan_free' && !paypalClientId) {
      supabase.functions.invoke('get-paypal-config').then(({ data }) => {
        if (data?.clientId) setPaypalClientId(data.clientId);
      });
    }
  }, [selectedPlan, paypalClientId]);

  // Check if user is first-time buyer (no completed orders)
  useEffect(() => {
    supabase.from('orders').select('id').eq('user_id', userId).eq('status', 'completed').limit(1)
      .then(({ data }) => {
        setIsFirstTimeBuyer(!data || data.length === 0);
      });
  }, [userId]);

  // Reset coupon when plan changes
  useEffect(() => {
    setCouponDiscount(null);
    setCouponCode('');
    setCouponError('');
  }, [selectedPlan]);

  // Price calculations — use welcome price if first-time buyer
  const planConfig = PLAN_CONFIG[selectedPlan as PlanKey];
  const originalBaseAmount = planConfig ? (cycle === 'yearly' ? (planConfig.yearlyPrice ?? 0) : (planConfig.monthlyPrice ?? 0)) : 0;
  const welcomeBaseAmount = isFirstTimeBuyer ? (getWelcomePrice(selectedPlan, cycle) ?? originalBaseAmount) : originalBaseAmount;
  const baseAmount = welcomeBaseAmount;
  const welcomeDiscount = originalBaseAmount - welcomeBaseAmount;
  const addonDiscountRate = planConfig?.addonDiscount ?? 0;

  const { addonOriginal, addonFinal } = useMemo(() => {
    let original = 0;
    for (const [, qty] of Object.entries(addons)) {
      if (qty > 0) {
        original += cycle === 'yearly' ? ADDON_PRICE_MONTHLY * 10 * qty : ADDON_PRICE_MONTHLY * qty;
      }
    }
    original = Math.round(original * 100) / 100;
    const final = Math.round(original * (1 - addonDiscountRate) * 100) / 100;
    return { addonOriginal: original, addonFinal: final };
  }, [addons, cycle, addonDiscountRate]);

  const addonSaving = Math.round((addonOriginal - addonFinal) * 100) / 100;
  const subtotal = baseAmount + addonFinal;

  const discountAmount = useMemo(() => {
    if (!couponDiscount) return 0;
    if (couponDiscount.type === 'percentage') {
      return Math.round((subtotal * couponDiscount.value / 100) * 100) / 100;
    }
    return Math.min(couponDiscount.value, subtotal);
  }, [couponDiscount, subtotal]);

  const totalAmount = Math.round((subtotal - discountAmount) * 100) / 100;

  const updateAddon = (type: string, delta: number) => {
    setAddons(prev => {
      const current = prev[type] || 0;
      const next = Math.max(0, Math.min(10, current + delta));
      return { ...prev, [type]: next };
    });
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const goNext = () => setCurrentStepIndex(i => Math.min(i + 1, allSteps.length - 1));
  const goBack = () => {
    if (currentStep === 'checkout' && checkoutSubStep === 2) {
      setCheckoutSubStep(1);
      return;
    }
    if (currentStep === 'checkout') {
      setCheckoutSubStep(1);
    }
    setCurrentStepIndex(i => Math.max(i - 1, 0));
  };

  const getPlanColorLocal = () => {
    switch (userPlan) {
      case 'plan_plus': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'plan_pro': return 'bg-violet-500/10 text-violet-600 border-violet-200';
      case 'plan_enterprise': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      default: return 'bg-secondary text-secondary-foreground border-secondary';
    }
  };

  const getPlanLabelLocal = () => {
    switch (userPlan) {
      case 'plan_plus': return t.planPlus;
      case 'plan_pro': return t.planPro;
      case 'plan_enterprise': return t.planEnterprise;
      default: return t.planFree;
    }
  };

  const handleLanguageSelect = async (lang: 'en' | 'vi') => {
    setSelectedLang(lang);
    await setLocale(lang);
  };

  const handleLanguageContinue = () => {
    if (!selectedLang) {
      toast({ title: t.langRequired, variant: 'destructive' });
      return;
    }
    goNext();
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: t.pwTooShort, description: t.minChars, variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t.pwNotMatch, variant: 'destructive' });
      return;
    }
    if (newPassword === '123456') {
      toast({ title: t.pwSameDefault, variant: 'destructive' });
      return;
    }
    setIsChangingPassword(true);
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'update_password', user_id: userId, password: newPassword },
    });
    setIsChangingPassword(false);
    if (error || data?.error) {
      toast({ title: t.pwChangeFail, description: data?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: t.pwChangeSuccess });
    goNext();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: t.invalidFormat, variant: 'destructive' }); return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: t.fileTooLarge, variant: 'destructive' }); return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
    setSelectedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateInfo = () => {
    const errors: Record<string, boolean> = {};
    if (!yearBatch.trim()) errors.yearBatch = true;
    if (!major.trim()) errors.major = true;
    if (!phone.trim()) errors.phone = true;
    if (!skills.trim()) errors.skills = true;
    if (needsStudentId && !editStudentId.trim()) errors.editStudentId = true;
    if (needsFullName && !editFullName.trim()) errors.editFullName = true;
    setInfoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInfoNext = () => {
    if (!validateInfo()) {
      toast({ title: t.fillRequired, variant: 'destructive' });
      return;
    }
    goNext();
  };

  const fireCelebration = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;
    const colors = ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors, zIndex: 99999 });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors, zIndex: 99999 });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    confetti({ particleCount: 100, spread: 100, origin: { y: 0.6 }, colors, zIndex: 99999 });
  }, []);

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${userId}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await r2Storage
          .from('avatars')
          .upload(filePath, selectedFile, { upsert: true, contentType: selectedFile.type });
        if (uploadError) throw uploadError;
        avatarUrl = uploadData?.publicUrl;
      }

      const updateData: Record<string, any> = {
        year_batch: yearBatch.trim() || null,
        major: major.trim() || null,
        phone: phone.trim() || null,
        skills: skills.trim() || null,
        bio: bio.trim() || null,
        onboarding_completed: true,
        must_change_password: false,
        user_plan: 'plan_free' as const,
      };
      if (avatarUrl) updateData.avatar_url = avatarUrl;
      if (needsStudentId) updateData.student_id = editStudentId.trim();
      if (needsFullName) updateData.full_name = editFullName.trim();

      const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
      if (error) throw error;

      setShowCelebration(true);
      fireCelebration();

      setTimeout(async () => {
        toast({ title: t.completedToast, description: t.completedToastDesc });
        onComplete();
      }, 2500);
    } catch (error: any) {
      toast({ title: appT.common.error, description: error.message, variant: 'destructive' });
      setIsSaving(false);
    }
  };

  const handlePlanContinue = () => {
    if (selectedPlan !== 'plan_free') {
      // Go to checkout step (it's dynamically added to allSteps)
      goNext();
    } else {
      goNext(); // Goes to finish
    }
  };

  // Checkout handlers
  const applyCoupon = useCallback(async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setCouponDiscount(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-coupon', {
        body: { code: couponCode.trim(), plan: selectedPlan },
      });

      if (error || !data?.valid) {
        const errorKey = data?.error || 'invalid';
        const msg = COUPON_ERROR_MAP[errorKey];
        setCouponError(msg ? (isVi ? msg.vi : msg.en) : (isVi ? 'Mã không hợp lệ' : 'Invalid coupon code'));
        setCouponLoading(false);
        return;
      }

      setCouponDiscount({ type: data.discount_type, value: data.discount_value, code: data.code });
      toast({ title: isVi ? 'Đã áp dụng mã giảm giá!' : 'Coupon applied!' });
    } catch {
      setCouponError(isVi ? 'Lỗi hệ thống' : 'System error');
    } finally {
      setCouponLoading(false);
    }
  }, [couponCode, selectedPlan, isVi, toast]);

  const createOrder = useCallback(async () => {
    const addonsList = Object.entries(addons)
      .filter(([, qty]) => qty > 0)
      .map(([type, quantity]) => ({ type, quantity }));

    const res = await supabase.functions.invoke('create-paypal-order', {
      body: {
        plan: selectedPlan,
        billing_cycle: cycle,
        addons: addonsList,
        coupon_code: couponDiscount ? couponDiscount.code : undefined,
      },
    });

    if (res.error || !res.data?.orderID) {
      throw new Error(res.error?.message || 'Failed to create order');
    }

    return res.data.orderID;
  }, [selectedPlan, cycle, addons, couponDiscount]);

  const onApprove = useCallback(async (data: { orderID: string }) => {
    setPaymentStatus('processing');
    try {
      const res = await supabase.functions.invoke('capture-paypal-order', {
        body: { orderID: data.orderID },
      });

      if (res.error || !res.data?.success) {
        throw new Error(res.error?.message || 'Payment capture failed');
      }

      setPaymentStatus('success');
      toast({ title: isVi ? 'Thanh toán thành công!' : 'Payment successful!' });
      // Go to finish step
      goNext();
    } catch {
      setPaymentStatus('failed');
      toast({ title: isVi ? 'Thanh toán thất bại. Vui lòng thử lại.' : 'Payment failed. Please try again.', variant: 'destructive' });
    }
  }, [isVi, toast]);

  const stepLabels: Record<StepId, string> = {
    language: t.stepLang,
    welcome: t.stepWelcome,
    password: t.stepSecurity,
    info: t.stepInfo,
    plan: t.stepPlan,
    checkout: t.stepCheckout,
    finish: t.stepFinish,
  };

  const stepDescriptions: Record<StepId, string> = {
    language: t.stepLangDesc,
    welcome: t.stepWelcomeDesc,
    password: t.stepSecurityDesc,
    info: t.stepInfoDesc,
    plan: t.stepPlanDesc,
    checkout: t.stepCheckoutDesc,
    finish: t.stepFinishDesc,
  };

  const getPasswordStrength = () => {
    if (!newPassword) return { level: 0, label: '', color: '' };
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    if (score <= 2) return { level: score, label: t.pwWeak, color: 'bg-destructive' };
    if (score <= 3) return { level: score, label: t.pwMedium, color: 'bg-warning' };
    return { level: score, label: t.pwStrong, color: 'bg-success' };
  };

  const pwStrength = getPasswordStrength();

  // Get features from pricing translations
  const getPlanFeatures = (planKey: string): string[] => {
    const pricingPlans = pricingT?.plans as any;
    if (!pricingPlans) return [];
    const map: Record<string, string> = {
      plan_free: 'free',
      plan_plus: 'plus',
      plan_pro: 'pro',
      plan_business: 'business',
    };
    return pricingPlans[map[planKey]]?.features ?? [];
  };

  const getPlanDescription = (planKey: string): string => {
    const pricingPlans = pricingT?.plans as any;
    if (!pricingPlans) return '';
    const map: Record<string, string> = {
      plan_free: 'free',
      plan_plus: 'plus',
      plan_pro: 'pro',
      plan_business: 'business',
    };
    return pricingPlans[map[planKey]]?.description ?? '';
  };

  const planCards: Array<{
    key: 'plan_free' | 'plan_plus' | 'plan_pro' | 'plan_business';
    icon: React.ReactNode;
    color: string;
    borderColor: string;
    checkColor: string;
    badgeBg: string;
    recommended?: boolean;
  }> = [
    { key: 'plan_free', icon: <Zap className="w-4 h-4 text-muted-foreground" />, color: 'text-muted-foreground', borderColor: 'border-primary', checkColor: 'bg-primary', badgeBg: '' },
    { key: 'plan_plus', icon: <Zap className="w-4 h-4 text-blue-500" />, color: 'text-blue-500', borderColor: 'border-blue-500', checkColor: 'bg-blue-500', badgeBg: '' },
    { key: 'plan_pro', icon: <Crown className="w-4 h-4 text-violet-500" />, color: 'text-violet-500', borderColor: 'border-violet-500', checkColor: 'bg-violet-500', badgeBg: 'bg-violet-500', recommended: true },
    { key: 'plan_business', icon: <Crown className="w-4 h-4 text-amber-500" />, color: 'text-amber-500', borderColor: 'border-amber-500', checkColor: 'bg-amber-500', badgeBg: '' },
  ];

  const hasAddons = Object.values(addons).some(q => q > 0);

  return (
    <div className="min-h-screen flex bg-background">
      {/* ===== SIDEBAR ===== */}
      <div className="hidden md:flex w-[300px] shrink-0 relative overflow-hidden flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-0 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative z-10 p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10">
            <img src={tNexusTextWhite} alt="T-Nexus" className="h-7 object-contain" />
          </div>

          <div className="flex-1 space-y-0">
            {allSteps.map((step, idx) => {
              const isDone = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={step}>
                  <div className={cn(
                    'flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-300',
                    isCurrent && 'bg-white/15 backdrop-blur-sm',
                  )}>
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-300 shrink-0',
                      isDone ? 'bg-white text-primary shadow-lg' :
                      isCurrent ? 'bg-white text-primary shadow-lg scale-110' :
                      'bg-white/10 text-white/40 border border-white/20'
                    )}>
                      {isDone ? <Check className="w-4 h-4" /> : stepIcons[step]}
                    </div>
                    <div className="min-w-0">
                      <p className={cn(
                        'text-sm font-semibold transition-colors',
                        isCurrent ? 'text-white' : isDone ? 'text-white/80' : 'text-white/40'
                      )}>
                        {stepLabels[step]}
                      </p>
                      <p className={cn(
                        'text-[11px] truncate',
                        isCurrent ? 'text-white/70' : 'text-white/30'
                      )}>
                        {stepDescriptions[step]}
                      </p>
                    </div>
                  </div>
                  {idx < allSteps.length - 1 && (
                    <div className="flex justify-center py-0.5">
                      <div className={cn(
                        'w-0.5 h-4 rounded-full transition-colors',
                        idx < currentStepIndex ? 'bg-white/50' : 'bg-white/15'
                      )} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-4 border-t border-white/15">
            <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
              <Avatar className="h-9 w-9 border border-white/30">
                {previewUrl ? (
                  <AvatarImage src={previewUrl} />
                ) : (
                  <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                    {getInitials(userFullName)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{userFullName}</p>
                <p className="text-[10px] text-white/50 truncate">{userEmail}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/auth');
                }}
                title={isVi ? 'Đăng xuất' : 'Log out'}
                className="shrink-0 p-1.5 rounded-lg hover:bg-white/15 text-white/60 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile step indicator */}
        <div className="md:hidden flex items-center gap-2 px-5 pt-4 pb-2">
          <img src={tNexusTextWhite} alt="T-Nexus" className="h-5 brightness-0 dark:brightness-100" />
          <div className="ml-auto flex items-center gap-1.5">
            {allSteps.map((_, idx) => (
              <div key={idx} className={cn(
                'h-1.5 rounded-full transition-all',
                idx === currentStepIndex ? 'w-6 bg-primary' :
                idx < currentStepIndex ? 'w-3 bg-primary/50' : 'w-3 bg-muted'
              )} />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div key={currentStep} className="animate-fade-in h-full">
            {/* ===== LANGUAGE STEP ===== */}
            {currentStep === 'language' && (
              <div className="h-full flex flex-col items-center justify-center px-6 md:px-10">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Globe className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-2 text-center">
                  {t.langTitle}
                </h2>
                <p className="text-muted-foreground mb-8 text-center max-w-md">
                  {t.langSubtitle}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mb-8">
                  <button
                    onClick={() => handleLanguageSelect('en')}
                    className={cn(
                      'flex-1 flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 text-left',
                      selectedLang === 'en'
                        ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/40 hover:bg-muted/50'
                    )}
                  >
                    <span className="text-3xl">🇺🇸</span>
                    <div>
                      <p className="font-bold text-base">English</p>
                      <p className="text-xs text-muted-foreground">Use English interface</p>
                    </div>
                    {selectedLang === 'en' && (
                      <div className="ml-auto w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handleLanguageSelect('vi')}
                    className={cn(
                      'flex-1 flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 text-left',
                      selectedLang === 'vi'
                        ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/40 hover:bg-muted/50'
                    )}
                  >
                    <span className="text-3xl">🇻🇳</span>
                    <div>
                      <p className="font-bold text-base">Tiếng Việt</p>
                      <p className="text-xs text-muted-foreground">Sử dụng giao diện tiếng Việt</p>
                    </div>
                    {selectedLang === 'vi' && (
                      <div className="ml-auto w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                </div>

                <Button
                  onClick={handleLanguageContinue}
                  disabled={!selectedLang}
                  size="lg"
                  className="w-full max-w-xs gap-2 h-12 text-base rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  {t.continueBtn}
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            )}

            {/* ===== WELCOME ===== */}
            {currentStep === 'welcome' && (
              <div className="h-full flex flex-col">
                <div className="relative bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 px-8 pt-6 pb-2 flex justify-center">
                  <img src={welcomeImg} alt="Welcome" className="h-40 md:h-48 object-contain drop-shadow-lg" />
                  <div className="absolute top-4 left-8 w-8 h-8 rounded-lg bg-primary/10 animate-pulse" />
                  <div className="absolute bottom-8 right-12 w-6 h-6 rounded-full bg-accent/15 animate-pulse delay-500" />
                </div>

                <div className="flex-1 px-6 md:px-10 pb-6 flex flex-col items-center text-center">
                  <h2 className="text-2xl md:text-3xl font-extrabold mt-4 mb-1 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {t.welcomeTitle}
                  </h2>
                  <p className="text-muted-foreground mb-5 max-w-md">
                    {t.welcomeSubtitle.replace('{name}', userFullName)}
                  </p>

                  <div className="w-full max-w-xl grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                    <div className="bg-card border rounded-2xl p-4 text-left space-y-2.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.accountInfo}</p>
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">{t.studentId}</p>
                          <p className="font-semibold text-sm">{userStudentId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Mail className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground">{t.email}</p>
                          <p className="font-semibold text-sm truncate">{userEmail}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-2xl p-4 text-left bg-gradient-to-br from-secondary/40 to-secondary/10 border-secondary/40">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t.currentPlan}</p>
                      <Badge className={cn('gap-1.5 px-3 py-1.5 text-sm border', getPlanColorLocal())}>
                        <Sparkles className="w-4 h-4" />
                        {getPlanLabelLocal()}
                      </Badge>
                    </div>
                  </div>

                  <div className="w-full max-w-xl grid grid-cols-4 gap-2 mb-6">
                    {[
                      { icon: <FolderKanban className="w-4 h-4" />, label: t.projectMgmt },
                      { icon: <ListChecks className="w-4 h-4" />, label: t.trackProgress },
                      { icon: <Users className="w-4 h-4" />, label: t.teamwork },
                      { icon: <MessageSquare className="w-4 h-4" />, label: t.messaging },
                    ].map((f, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          {f.icon}
                        </div>
                        <p className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{f.label}</p>
                      </div>
                    ))}
                  </div>

                  <Button onClick={goNext} size="lg" className="w-full max-w-xs gap-2 h-12 text-base rounded-xl shadow-lg hover:shadow-xl transition-all">
                    {t.startSetup}
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                  <button
                    type="button"
                    onClick={goBack}
                    className="mt-3 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    {t.changeLang}
                  </button>
                </div>
              </div>
            )}

            {/* ===== PASSWORD ===== */}
            {currentStep === 'password' && (
              <div className="h-full flex flex-col">
                <div className="relative bg-gradient-to-br from-warning/10 via-warning/5 to-transparent px-8 pt-6 pb-2 flex justify-center">
                  <img src={securityImg} alt="Security" className="h-32 md:h-40 object-contain drop-shadow-lg" />
                </div>

                <div className="flex-1 px-6 md:px-10 pb-6 flex flex-col items-center">
                  <div className="w-full max-w-md">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-extrabold mb-1">{t.securityTitle}</h2>
                      <p className="text-muted-foreground text-sm">{t.securityDesc}</p>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-5">
                      <p className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" /> {t.securityTip}
                      </p>
                      <ul className="text-[11px] text-muted-foreground space-y-0.5">
                        <li>{t.securityTip1}</li>
                        <li>{t.securityTip2}</li>
                        <li>{t.securityTip3}</li>
                      </ul>
                      <p className="text-[10px] text-muted-foreground/70 mt-2 italic leading-relaxed">
                        {t.securityDisclaimer}
                      </p>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="newPassword" className="text-sm font-medium">{t.newPassword}</Label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="newPassword" type={showPassword ? 'text' : 'password'} placeholder={t.minChars}
                            className="pl-10 pr-10 h-12 rounded-xl" value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)} required autoFocus />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {newPassword && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={cn('flex-1 rounded-full transition-colors', i <= pwStrength.level ? pwStrength.color : 'bg-muted')} />
                              ))}
                            </div>
                            <span className={cn('text-[10px] font-medium', pwStrength.level <= 2 ? 'text-destructive' : pwStrength.level <= 3 ? 'text-warning' : 'text-success')}>
                              {pwStrength.label}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium">{t.confirmPassword}</Label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="confirmPassword" type={showConfirm ? 'text' : 'password'} placeholder={t.reenterPassword}
                            className="pl-10 pr-10 h-12 rounded-xl" value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)} required />
                          <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {confirmPassword && newPassword !== confirmPassword && (
                          <p className="text-[11px] text-destructive mt-0.5">{t.passwordMismatch}</p>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={goBack} className="h-12 gap-2 rounded-xl text-base flex-1">
                          <ChevronLeft className="w-5 h-5" /> {t.goBack}
                        </Button>
                        <Button type="submit" disabled={isChangingPassword} className="h-12 gap-2 rounded-xl text-base shadow-lg flex-[2]">
                          {isChangingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                          {t.continueNext} <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* ===== INFO ===== */}
            {currentStep === 'info' && (
              <div className="h-full flex flex-col">
                <div className="relative bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 px-8 pt-4 pb-1 flex justify-center">
                  <img src={profileImg} alt="Profile" className="h-24 md:h-28 object-contain drop-shadow-lg" />
                </div>

                <div className="flex-1 px-6 md:px-10 pb-6 overflow-y-auto">
                  <div className="w-full max-w-lg mx-auto">
                    <div className="text-center mb-4">
                      <h2 className="text-xl font-extrabold mb-0.5">{t.infoTitle}</h2>
                      <p className="text-muted-foreground text-sm">{t.infoDesc}</p>
                    </div>

                    <div className="flex flex-col items-center mb-5">
                      <div className="relative group cursor-pointer mb-2" onClick={() => fileInputRef.current?.click()}>
                        <Avatar className="h-20 w-20 border-4 border-background shadow-xl ring-2 ring-primary/20">
                          {previewUrl ? (
                            <AvatarImage src={previewUrl} alt="Preview" />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary text-xl font-bold">
                              {getInitials(userFullName)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                          <Camera className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-primary font-medium hover:underline">
                        {previewUrl ? t.changeAvatar : t.uploadAvatar}
                      </button>
                      <p className="text-[10px] text-muted-foreground">{t.avatarOptional}</p>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        ...(needsFullName ? [{ id: 'editFullName', label: isVi ? 'Họ tên' : 'Full Name', icon: <User className="w-4 h-4" />, placeholder: isVi ? 'Nhập họ tên' : 'Enter full name', value: editFullName, setter: setEditFullName }] : []),
                        ...(needsStudentId ? [{ id: 'editStudentId', label: isVi ? 'MSSV' : 'Student ID', icon: <GraduationCap className="w-4 h-4" />, placeholder: isVi ? 'Nhập MSSV' : 'Enter Student ID', value: editStudentId, setter: setEditStudentId }] : []),
                        { id: 'yearBatch', label: t.fieldBatch, icon: <GraduationCap className="w-4 h-4" />, placeholder: t.fieldBatchPlaceholder, value: yearBatch, setter: setYearBatch },
                        { id: 'major', label: t.fieldMajor, icon: <BookOpen className="w-4 h-4" />, placeholder: t.fieldMajorPlaceholder, value: major, setter: setMajor },
                        { id: 'phone', label: t.fieldPhone, icon: <Phone className="w-4 h-4" />, placeholder: t.fieldPhonePlaceholder, value: phone, setter: setPhone },
                        { id: 'skills', label: t.fieldSkills, icon: <Award className="w-4 h-4" />, placeholder: t.fieldSkillsPlaceholder, value: skills, setter: setSkills },
                      ].map(field => (
                        <div key={field.id} className={cn(
                          'rounded-xl border p-3 transition-all',
                          infoErrors[field.id] ? 'border-destructive bg-destructive/5' : 'bg-card hover:shadow-sm'
                        )}>
                          <Label htmlFor={field.id} className="text-xs flex items-center gap-1.5 mb-1.5 font-semibold">
                            <span className="text-primary">{field.icon}</span>
                            {field.label} <span className="text-destructive">*</span>
                          </Label>
                          <Input id={field.id} placeholder={field.placeholder}
                            value={field.value}
                            onChange={(e) => { field.setter(e.target.value); setInfoErrors(p => ({ ...p, [field.id]: false })); }}
                            className={cn('h-9 border-0 bg-muted/50 rounded-lg focus-visible:ring-1', infoErrors[field.id] && 'bg-destructive/10')} />
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 rounded-xl border bg-card p-3">
                      <Label htmlFor="bio" className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
                        <Sparkles className="w-4 h-4 text-primary" /> {t.fieldBio}
                        <span className="text-muted-foreground font-normal">{t.fieldBioOptional}</span>
                      </Label>
                      <Textarea id="bio" placeholder={t.fieldBioPlaceholder}
                        value={bio} onChange={(e) => setBio(e.target.value)}
                        rows={2} className="resize-none border-0 bg-muted/50 rounded-lg focus-visible:ring-1" />
                    </div>

                    <div className="flex gap-3 mt-4">
                      <Button variant="outline" onClick={goBack} className="h-12 gap-2 rounded-xl text-base flex-1">
                        <ChevronLeft className="w-5 h-5" /> {t.goBack}
                      </Button>
                      <Button onClick={handleInfoNext} className="h-12 gap-2 rounded-xl text-base shadow-lg flex-[2]">
                        {t.continueNext} <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== PLAN SELECTION (with full features) ===== */}
            {currentStep === 'plan' && (
              <div className="h-full flex flex-col">
                <div className="px-6 md:px-10 pt-6 pb-2 text-center">
                  <h2 className="text-2xl md:text-3xl font-extrabold mb-1">
                    {t.choosePlanTitle}
                  </h2>
                  <p className="text-muted-foreground text-sm whitespace-nowrap mx-auto">
                    {t.choosePlanDesc}
                  </p>
                </div>

                <div className="flex-1 px-4 md:px-8 pb-6 overflow-y-auto">
                  {/* Billing Cycle Toggle */}
                  <div className="flex justify-center mt-3 mb-3">
                    <div className="flex items-center gap-1 text-xs bg-muted rounded-full p-0.5">
                      <button
                        onClick={() => setCycle('monthly')}
                        className={cn(
                          "px-4 py-1.5 rounded-full transition-colors font-medium",
                          cycle === 'monthly' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {isVi ? 'Tháng' : 'Monthly'}
                      </button>
                      <button
                        onClick={() => setCycle('yearly')}
                        className={cn(
                          "px-4 py-1.5 rounded-full transition-colors font-medium",
                          cycle === 'yearly' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {isVi ? 'Năm' : 'Yearly'}
                        <span className="ml-1 opacity-75">-17%</span>
                      </button>
                    </div>
                  </div>

                  {/* Welcome Offer Banner */}
                  {isFirstTimeBuyer && (
                    <div className="max-w-5xl mx-auto mb-4 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-primary/10 to-violet-500/10 border border-emerald-500/20">
                      <div className="text-center">
                        <p className="font-bold text-sm">{t.welcomeBannerTitle}</p>
                        <p className="text-sm">{t.welcomeBannerDesc}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{t.welcomeBannerNote}</p>
                      </div>
                    </div>
                  )}

                  <div className="w-full max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {planCards.map(card => {
                      const cfg = PLAN_CONFIG[card.key];
                      const features = getPlanFeatures(card.key);
                      const desc = getPlanDescription(card.key);
                      const isSelected = selectedPlan === card.key;
                      const originalPrice = cycle === 'yearly' ? cfg.yearlyPrice : cfg.monthlyPrice;
                      const welcomePrice = isFirstTimeBuyer ? getWelcomePrice(card.key, cycle) : null;
                      const showWelcome = welcomePrice !== null && welcomePrice !== originalPrice && card.key !== 'plan_free';
                      const displayPrice = showWelcome ? welcomePrice : originalPrice;
                      const cycleLabel = cycle === 'yearly' ? t.planYear : t.planMonth;

                      return (
                        <button
                          key={card.key}
                          onClick={() => setSelectedPlan(card.key)}
                          className={cn(
                            'relative flex flex-col rounded-2xl border-2 p-4 text-left transition-all duration-200',
                            isSelected
                              ? `${card.borderColor} bg-primary/5 shadow-lg ring-2 ring-primary/20`
                              : 'border-border hover:border-primary/30 hover:bg-muted/50'
                          )}
                        >
                          {card.recommended && (
                            <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-violet-500 text-white border-0 text-[10px] px-2 py-0.5">
                              {t.planRecommended}
                            </Badge>
                          )}

                          <div className="flex items-center gap-2 mb-1">
                            {card.icon}
                            <span className="font-bold text-sm">{cfg.label}</span>
                          </div>

                          <div className="mb-0.5">
                            {showWelcome && (
                              <span className="text-sm text-muted-foreground line-through mr-1.5">${originalPrice}</span>
                            )}
                            <span className="text-xl font-extrabold">
                              {displayPrice !== null ? `$${displayPrice}` : isVi ? 'Tùy chỉnh' : 'Custom'}
                            </span>
                            {displayPrice !== null && <span className="text-xs font-normal text-muted-foreground">/{cycleLabel}</span>}
                          </div>

                          {desc && (
                            <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">{desc}</p>
                          )}

                          <ul className="text-[11px] text-muted-foreground space-y-1">
                            {features.map((f, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <Check className={cn('w-3 h-3 shrink-0 mt-0.5', card.color)} />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>

                          {isSelected && (
                            <div className={cn('absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center', card.checkColor)}>
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-muted-foreground text-center mb-1 max-w-md mx-auto">
                    {t.planNote}
                  </p>
                  <button
                    type="button"
                    onClick={() => window.open('/guide/pricing', '_blank')}
                    className="text-[11px] text-primary hover:underline text-center block mx-auto mb-2"
                  >
                    {t.planGuideLink}
                  </button>
                  <p className="text-[10px] text-muted-foreground text-center mb-4 max-w-md mx-auto">
                    {t.planContactEnterprise}
                  </p>

                  <div className="flex gap-3 w-full max-w-xs mx-auto">
                    <Button variant="outline" onClick={goBack} className="h-12 gap-2 rounded-xl text-base flex-1">
                      <ChevronLeft className="w-5 h-5" /> {t.goBack}
                    </Button>
                    <Button onClick={handlePlanContinue} disabled={isSaving} className="h-12 gap-2 rounded-xl text-base shadow-lg flex-[2]">
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {selectedPlan !== 'plan_free' ? t.planGoCheckout : t.continueNext} <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ===== CHECKOUT (inline) ===== */}
            {currentStep === 'checkout' && (
              <div className="h-full flex flex-col">
                <div className="px-6 md:px-10 pt-6 pb-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-2xl font-extrabold mb-1">
                    {checkoutSubStep === 1
                      ? (isVi ? 'Thanh toán' : 'Checkout')
                      : (isVi ? 'Xác nhận & Thanh toán' : 'Confirm & Pay')}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {checkoutSubStep === 1
                      ? (isVi ? `Bước 1/2 — Chọn gói & tùy chỉnh` : `Step 1/2 — Select plan & customize`)
                      : (isVi ? `Bước 2/2 — Kiểm tra và thanh toán` : `Step 2/2 — Review and pay`)}
                  </p>
                </div>

                <div className="flex-1 px-4 md:px-8 pb-6 overflow-y-auto">
                  {/* Welcome Offer Banner in checkout */}
                  {isFirstTimeBuyer && welcomeDiscount > 0 && (
                    <div className="max-w-4xl mx-auto mb-4 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-primary/10 to-violet-500/10 border border-emerald-500/20">
                      <div className="text-center">
                        <p className="font-bold text-sm">{t.welcomeBannerTitle}</p>
                        <p className="text-sm">{t.welcomeBannerDesc}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{t.welcomeBannerNote}</p>
                      </div>
                    </div>
                  )}

                  {/* ═══ SUB-STEP 1: Config + Order Summary ═══ */}
                  {checkoutSubStep === 1 && (
                    <>
                      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-5">
                        {/* Left: Config */}
                        <div className="lg:col-span-3 space-y-4">
                          {/* Billing Cycle */}
                          <Card>
                            <CardContent className="pt-4 pb-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">{isVi ? 'Chu kỳ thanh toán' : 'Billing Cycle'}</h3>
                                <div className="flex items-center gap-1 text-xs bg-muted rounded-full p-0.5">
                                  <button
                                    onClick={() => setCycle('monthly')}
                                    className={cn(
                                      "px-3 py-1 rounded-full transition-colors font-medium",
                                      cycle === 'monthly' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                  >
                                    {isVi ? 'Tháng' : 'Monthly'}
                                  </button>
                                  <button
                                    onClick={() => setCycle('yearly')}
                                    className={cn(
                                      "px-3 py-1 rounded-full transition-colors font-medium",
                                      cycle === 'yearly' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                  >
                                    {isVi ? 'Năm' : 'Yearly'}
                                    <span className="ml-1 opacity-75">-17%</span>
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                                <div>
                                  <p className="font-semibold text-sm">{getPlanLabelFromConfig(selectedPlan)} Plan</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {cycle === 'yearly' ? (isVi ? 'Thanh toán theo năm' : 'Billed yearly') : (isVi ? 'Thanh toán theo tháng' : 'Billed monthly')}
                                  </p>
                                </div>
                                <div className="text-right">
                                  {welcomeDiscount > 0 && (
                                    <span className="text-sm text-muted-foreground line-through mr-1.5">${originalBaseAmount.toFixed(2)}</span>
                                  )}
                                  <span className="text-lg font-bold">${baseAmount.toFixed(2)}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Add-ons */}
                          <Card>
                            <CardContent className="pt-4 pb-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  Add-ons
                                </h3>
                              </div>
                              <div className="space-y-2">
                                {ADDON_TYPES.map(addon => {
                                  const qty = addons[addon.type] || 0;
                                  const unitOriginal = cycle === 'yearly' ? ADDON_PRICE_MONTHLY * 10 : ADDON_PRICE_MONTHLY;
                                  const unitFinal = Math.round(unitOriginal * (1 - addonDiscountRate) * 100) / 100;
                                  const hasDiscount = addonDiscountRate > 0;
                                  return (
                                    <div key={addon.type} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
                                      <div className="flex items-center gap-2.5">
                                        <span className="text-lg">{addon.emoji}</span>
                                        <div>
                                          <p className="font-medium text-sm">{isVi ? addon.unitLabelVi : addon.unitLabel}</p>
                                          <div className="flex items-center gap-1 text-[11px]">
                                            {hasDiscount && (
                                              <span className="text-muted-foreground line-through">${unitOriginal.toFixed(2)}</span>
                                            )}
                                            <span className={hasDiscount ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                                              ${unitFinal.toFixed(2)}
                                            </span>
                                            <span className="text-muted-foreground">/{cycle === 'yearly' ? (isVi ? 'năm' : 'yr') : (isVi ? 'tháng' : 'mo')}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateAddon(addon.type, -1)} disabled={qty === 0}>
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="w-5 text-center font-medium text-sm tabular-nums">{qty}</span>
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateAddon(addon.type, 1)} disabled={qty >= 10}>
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Coupon */}
                          <Card>
                            <CardContent className="pt-4 pb-4 space-y-2">
                              <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Tag className="h-3.5 w-3.5" />
                                {isVi ? 'Mã giảm giá' : 'Discount Code'}
                              </h3>
                              <div className="flex gap-2">
                                <Input
                                  placeholder={isVi ? 'Nhập mã' : 'Enter code'}
                                  value={couponCode}
                                  onChange={e => { setCouponCode(e.target.value); setCouponError(''); }}
                                  className="flex-1 h-9"
                                  disabled={!!couponDiscount}
                                />
                                {couponDiscount ? (
                                  <Button variant="outline" size="sm" onClick={() => { setCouponDiscount(null); setCouponCode(''); }}>
                                    {isVi ? 'Xóa' : 'Remove'}
                                  </Button>
                                ) : (
                                  <Button size="sm" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}>
                                    {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isVi ? 'Áp dụng' : 'Apply')}
                                  </Button>
                                )}
                              </div>
                              {couponError && <p className="text-xs text-destructive">{couponError}</p>}
                              {couponDiscount && (
                                <Badge variant="secondary" className="text-emerald-600">
                                  {couponDiscount.type === 'percentage' ? `-${couponDiscount.value}%` : `-$${couponDiscount.value.toFixed(2)}`} {isVi ? 'đã áp dụng' : 'applied'}
                                </Badge>
                              )}
                            </CardContent>
                          </Card>
                        </div>

                        {/* Right: Order Summary (sticky) */}
                        <div className="lg:col-span-2">
                          <Card className="sticky top-4 border-primary/30 bg-primary/5">
                            <CardContent className="pt-4 pb-4 space-y-3">
                              <h3 className="text-sm font-semibold">{isVi ? 'Tóm tắt đơn hàng' : 'Order Summary'}</h3>
                              <Separator />

                              {/* Items */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium">{getPlanLabelFromConfig(selectedPlan)} Plan</span>
                                  <span className="font-semibold">${originalBaseAmount.toFixed(2)}</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  {cycle === 'yearly' ? (isVi ? 'Theo năm' : 'Billed yearly') : (isVi ? 'Theo tháng' : 'Billed monthly')}
                                </p>
                                {hasAddons && ADDON_TYPES.map(addon => {
                                  const qty = addons[addon.type] || 0;
                                  if (qty === 0) return null;
                                  const unitOriginal = cycle === 'yearly' ? ADDON_PRICE_MONTHLY * 10 : ADDON_PRICE_MONTHLY;
                                  return (
                                    <div key={addon.type} className="flex justify-between text-sm text-muted-foreground">
                                      <span>{addon.emoji} {isVi ? addon.unitLabelVi : addon.unitLabel} ×{qty}</span>
                                      <span>${(unitOriginal * qty).toFixed(2)}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Subtotal + Discounts */}
                              {(welcomeDiscount > 0 || addonSaving > 0 || discountAmount > 0) && (
                                <>
                                  <Separator className="my-1" />
                                  <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>{isVi ? 'Tạm tính' : 'Subtotal'}</span>
                                    <span>${(originalBaseAmount + addonOriginal).toFixed(2)}</span>
                                  </div>
                                </>
                              )}

                              {(welcomeDiscount > 0 || addonSaving > 0 || discountAmount > 0) && (
                                <div className="space-y-1">
                                  {welcomeDiscount > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-600">
                                      <span>🎉 {isVi ? 'Ưu đãi chào mừng' : 'Welcome Offer'}</span>
                                      <span>-${welcomeDiscount.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {addonSaving > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-600">
                                      <span>{isVi ? `Tiết kiệm add-on (${addonDiscountRate * 100}%)` : `Add-on savings (${addonDiscountRate * 100}%)`}</span>
                                      <span>-${addonSaving.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {discountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-600">
                                      <span className="flex items-center gap-1">
                                        <Tag className="h-3 w-3" />
                                        {couponDiscount?.code}
                                      </span>
                                      <span>-${discountAmount.toFixed(2)}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              <Separator />

                              <div className="flex justify-between font-bold text-lg">
                                <span>{isVi ? 'Tổng' : 'Total'}</span>
                                <span>${totalAmount.toFixed(2)}</span>
                              </div>

                              <p className="text-[11px] text-muted-foreground text-center">
                                {cycle === 'yearly'
                                  ? (isVi ? 'Thanh toán 1 lần / năm' : 'Billed once per year')
                                  : (isVi ? 'Thanh toán 1 lần / tháng' : 'Billed once per month')}
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Bottom CTA bar */}
                      <div className="max-w-4xl mx-auto mt-5 flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                        <div>
                          <p className="text-xs text-muted-foreground">{isVi ? 'Tổng' : 'Total'}</p>
                          <p className="text-2xl font-bold">${totalAmount.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={goBack} className="h-10 gap-2 rounded-xl text-sm">
                            <ChevronLeft className="w-4 h-4" /> {isVi ? 'Quay lại' : 'Back'}
                          </Button>
                          <Button size="lg" className="gap-2 px-8 text-base" onClick={() => setCheckoutSubStep(2)}>
                            {isVi ? 'Thanh toán' : 'Continue to Pay'}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ═══ SUB-STEP 2: Order Summary Table + Payment Method + Pay Box ═══ */}
                  {checkoutSubStep === 2 && (
                    <>
                      {/* Order Summary Table */}
                      <div className="max-w-4xl mx-auto">
                        <Card>
                          <CardContent className="pt-5 pb-5">
                            <h3 className="text-base font-semibold mb-4">{isVi ? 'Tóm tắt đơn hàng' : 'Order Summary'}</h3>

                            {/* Table header */}
                            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                              <div className="col-span-6">{isVi ? 'Sản phẩm' : 'Item'}</div>
                              <div className="col-span-2 text-right">{isVi ? 'Đơn giá' : 'Price'}</div>
                              <div className="col-span-2 text-center">{isVi ? 'SL' : 'Qty'}</div>
                              <div className="col-span-2 text-right">{isVi ? 'Thành tiền' : 'Total'}</div>
                            </div>

                            {/* Plan row — show original price */}
                            <div className="grid grid-cols-12 gap-2 items-center py-3 text-sm border-b border-dashed">
                              <div className="col-span-6">
                                <p className="font-medium">{getPlanLabelFromConfig(selectedPlan)} Plan</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {cycle === 'yearly' ? (isVi ? 'Theo năm' : 'Billed yearly') : (isVi ? 'Theo tháng' : 'Billed monthly')}
                                </p>
                              </div>
                              <div className="col-span-2 text-right text-muted-foreground">${originalBaseAmount.toFixed(2)}</div>
                              <div className="col-span-2 text-center text-muted-foreground">1</div>
                              <div className="col-span-2 text-right font-medium">${originalBaseAmount.toFixed(2)}</div>
                            </div>

                            {/* Addon rows — show original prices */}
                            {ADDON_TYPES.map(addon => {
                              const qty = addons[addon.type] || 0;
                              if (qty === 0) return null;
                              const unitOriginal = cycle === 'yearly' ? ADDON_PRICE_MONTHLY * 10 : ADDON_PRICE_MONTHLY;
                              const lineTotal = unitOriginal * qty;
                              return (
                                <div key={addon.type} className="grid grid-cols-12 gap-2 items-center py-2.5 text-sm border-b border-dashed">
                                  <div className="col-span-6 flex items-center gap-2">
                                    <span>{addon.emoji}</span>
                                    <span>{isVi ? addon.unitLabelVi : addon.unitLabel}</span>
                                  </div>
                                  <div className="col-span-2 text-right text-muted-foreground">${unitOriginal.toFixed(2)}</div>
                                  <div className="col-span-2 text-center text-muted-foreground">{qty}</div>
                                  <div className="col-span-2 text-right font-medium">${lineTotal.toFixed(2)}</div>
                                </div>
                              );
                            })}

                            {/* Subtotal / Discounts / Total */}
                            <div className="pt-3 space-y-1.5">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{isVi ? 'Tạm tính' : 'Subtotal'}</span>
                                <span>${(originalBaseAmount + addonOriginal).toFixed(2)}</span>
                              </div>
                              {welcomeDiscount > 0 && (
                                <div className="flex justify-between text-sm text-emerald-600">
                                  <span>🎉 {isVi ? 'Ưu đãi chào mừng' : 'Welcome Offer'}</span>
                                  <span>-${welcomeDiscount.toFixed(2)}</span>
                                </div>
                              )}
                              {addonSaving > 0 && (
                                <div className="flex justify-between text-sm text-emerald-600">
                                  <span>{isVi ? `Tiết kiệm add-on (${addonDiscountRate * 100}%)` : `Add-on savings (${addonDiscountRate * 100}%)`}</span>
                                  <span>-${addonSaving.toFixed(2)}</span>
                                </div>
                              )}
                              {discountAmount > 0 && (
                                <div className="flex justify-between text-sm text-emerald-600">
                                  <span className="flex items-center gap-1">
                                    <Tag className="h-3 w-3" />
                                    {isVi ? 'Mã giảm giá' : 'Coupon'} ({couponDiscount?.code})
                                  </span>
                                  <span>-${discountAmount.toFixed(2)}</span>
                                </div>
                              )}
                              <Separator />
                              <div className="flex justify-between font-bold text-lg pt-1">
                                <span>{isVi ? 'Tổng' : 'Total'}</span>
                                <span>${totalAmount.toFixed(2)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Bottom: 2-column — Payment Method | Pay Box */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mt-5">
                          {/* Left: Payment Methods */}
                          <div className="lg:col-span-3">
                            <Card>
                              <CardContent className="pt-5 pb-5 space-y-4">
                                <h4 className="text-base font-semibold flex items-center gap-2">
                                  <CreditCard className="h-4 w-4" />
                                  {isVi ? 'Phương thức thanh toán' : 'Payment Method'}
                                </h4>

                                {/* PayPal - collapsible */}
                                <div className="border rounded-xl overflow-hidden">
                                  <button
                                    onClick={() => setPaymentMethodOpen(!paymentMethodOpen)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                                      </div>
                                      <span className="font-medium text-sm">PayPal</span>
                                    </div>
                                    {paymentMethodOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                  </button>
                                  {paymentMethodOpen && (
                                    <div className="px-3 pb-3 pt-1">
                                      {paymentStatus === 'processing' ? (
                                        <div className="flex items-center justify-center py-6 gap-2">
                                          <Loader2 className="h-5 w-5 animate-spin" />
                                          <span className="text-sm text-muted-foreground">{isVi ? 'Đang xử lý thanh toán...' : 'Processing payment...'}</span>
                                        </div>
                                      ) : paypalClientId ? (
                                        <PayPalScriptProvider options={{ clientId: paypalClientId, currency: 'USD' }}>
                                          <PayPalButtons
                                            style={{ layout: 'vertical', shape: 'rect', label: 'pay', height: 40 }}
                                            createOrder={async () => createOrder()}
                                            onApprove={async (data) => onApprove(data)}
                                            onError={(err) => {
                                              console.error('PayPal error:', err);
                                              toast({ title: isVi ? 'PayPal gặp lỗi' : 'PayPal encountered an error', variant: 'destructive' });
                                            }}
                                            onCancel={() => {
                                              toast({ title: isVi ? 'Đã hủy thanh toán' : 'Payment cancelled' });
                                            }}
                                          />
                                        </PayPalScriptProvider>
                                      ) : (
                                        <div className="text-center py-4 text-sm text-muted-foreground">
                                          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                                          {isVi ? 'Đang tải hệ thống thanh toán...' : 'Loading payment system...'}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* MoMo - disabled */}
                                <div className="border rounded-xl p-3 opacity-50">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                                    <span className="font-medium text-sm">🟣 MoMo</span>
                                    <Badge variant="outline" className="text-[10px] ml-auto">{isVi ? 'Sắp ra mắt' : 'Coming soon'}</Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Right: Pay Box */}
                          <div className="lg:col-span-2">
                            <Card className="border-primary/30 bg-primary/5">
                              <CardContent className="pt-5 pb-5 space-y-4">
                                <div className="text-center space-y-1">
                                  <p className="text-sm text-muted-foreground">{isVi ? 'Tổng thanh toán' : 'Amount Due'}</p>
                                  <p className="text-3xl font-bold">${totalAmount.toFixed(2)}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {cycle === 'yearly'
                                      ? (isVi ? 'Thanh toán 1 lần / năm' : 'Billed once per year')
                                      : (isVi ? 'Thanh toán 1 lần / tháng' : 'Billed once per month')}
                                  </p>
                                </div>

                                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-2">
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  {isVi ? 'Thanh toán bảo mật qua PayPal' : 'Secure payment powered by PayPal'}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>

                        {/* Back button */}
                        <div className="flex justify-center mt-5">
                          <Button variant="outline" onClick={() => setCheckoutSubStep(1)} className="h-10 gap-2 rounded-xl text-sm">
                            <ArrowLeft className="w-4 h-4" /> {isVi ? 'Quay lại tùy chỉnh' : 'Back to configuration'}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ===== FINISH ===== */}
            {currentStep === 'finish' && (
              <div className="h-full flex flex-col">
                <div className="relative bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5 px-8 pt-6 pb-2 flex justify-center overflow-hidden">
                  <img src={completeImg} alt="Complete" className="h-36 md:h-44 object-contain drop-shadow-lg" />
                  <div className="absolute top-6 left-[20%] w-2 h-2 rounded-full bg-primary/30 animate-bounce" />
                  <div className="absolute top-10 right-[25%] w-3 h-3 rounded-full bg-accent/30 animate-bounce delay-300" />
                  <div className="absolute bottom-4 left-[30%] w-2 h-2 rounded-sm bg-warning/30 animate-bounce delay-500 rotate-45" />
                </div>

                <div className="flex-1 px-6 md:px-10 pb-6 flex flex-col items-center">
                  <h2 className="text-2xl md:text-3xl font-extrabold mt-3 mb-1 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {t.finishTitle}
                  </h2>
                  <p className="text-muted-foreground mb-5 text-center max-w-md">{t.finishDesc}</p>

                  <div className="w-full max-w-lg bg-card border rounded-2xl overflow-hidden shadow-sm mb-5">
                    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-3 flex items-center gap-3 border-b">
                      <Avatar className="h-12 w-12 border-2 border-background shadow">
                        {previewUrl ? (
                          <AvatarImage src={previewUrl} />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-bold">
                            {getInitials(userFullName)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-bold text-base">{userFullName}</p>
                        <p className="text-xs text-muted-foreground">{userStudentId} • {userEmail}</p>
                      </div>
                      <Badge className={cn('gap-1 text-xs ml-auto shrink-0 border', getPlanColorLocal())}>
                        <Sparkles className="w-3 h-3" />
                        {getPlanLabelLocal()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-0 divide-x divide-y">
                      {[
                        { icon: <GraduationCap className="w-3.5 h-3.5" />, label: t.batchLabel, value: yearBatch },
                        { icon: <BookOpen className="w-3.5 h-3.5" />, label: t.majorLabel, value: major },
                        { icon: <Phone className="w-3.5 h-3.5" />, label: t.phoneLabel, value: phone },
                        { icon: <Award className="w-3.5 h-3.5" />, label: t.skillsLabel, value: skills },
                      ].map((item, i) => (
                        <div key={i} className="px-4 py-2.5">
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">
                            <span className="text-primary">{item.icon}</span> {item.label}
                          </p>
                          <p className="text-sm font-medium truncate">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {bio && (
                      <div className="px-4 py-2.5 border-t">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">
                          <Sparkles className="w-3 h-3 text-primary" /> {t.bioLabel}
                        </p>
                        <p className="text-sm text-muted-foreground">{bio}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 w-full max-w-xs">
                    <Button variant="outline" onClick={goBack} className="h-12 gap-2 rounded-xl text-base flex-1">
                      <ChevronLeft className="w-5 h-5" /> {t.goBack}
                    </Button>
                    <Button onClick={handleFinish} disabled={isSaving} size="lg"
                      className="gap-2 h-12 text-base rounded-xl shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/90 flex-[2]">
                      {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                      {t.enterSystem}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Celebration Overlay */}
        {showCelebration && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm animate-fade-in">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center animate-scale-in">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                  <Check className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              <div className="absolute -top-2 -right-2 text-2xl animate-bounce">🎉</div>
              <div className="absolute -bottom-1 -left-2 text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              {t.celebrationTitle}
            </h2>
            <p className="text-muted-foreground text-center max-w-sm animate-fade-in" style={{ animationDelay: '0.5s' }}>
              {t.celebrationDesc}
            </p>
            <div className="mt-6 flex gap-1 animate-fade-in" style={{ animationDelay: '0.7s' }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
