import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { ArrowLeft, ArrowRight, Tag, Plus, Minus, ShieldCheck, CreditCard, Loader2, Check, Package, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { OrderCountdown } from '@/components/OrderCountdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

import { PLAN_CONFIG, getPlanLabel, getPlanRank, getWelcomePrice, type PlanKey, PLAN_ORDER } from '@/lib/planConfig';

/* ═══ Constants ═══ */

const PLANS = (['plan_plus', 'plan_pro', 'plan_business'] as const).map(key => {
  const cfg = PLAN_CONFIG[key];
  return { key, label: cfg.label, monthly: cfg.monthlyPrice!, yearly: cfg.yearlyPrice!, addonDiscount: cfg.addonDiscount, popular: key === 'plan_pro' };
});

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {};
const ADDON_DISCOUNT_RATE: Record<string, number> = {};
PLANS.forEach(p => {
  PLAN_PRICES[p.key] = { monthly: p.monthly, yearly: p.yearly };
  ADDON_DISCOUNT_RATE[p.key] = p.addonDiscount;
});

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

/* ═══ Component ═══ */

export default function Checkout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { translations: { checkout: t, common: tc } } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();

  // Support pre-fill from onboarding: /checkout?plan=X&cycle=Y&addons=projects:2,storage:1&coupon=CODE&from=onboarding
  const fromOnboarding = searchParams.get('from') === 'onboarding';
  const initialAddons: Record<string, number> = {};
  const addonsParam = searchParams.get('addons');
  if (addonsParam) {
    addonsParam.split(',').forEach(item => {
      const [type, qty] = item.split(':');
      if (type && qty) initialAddons[type] = parseInt(qty, 10) || 0;
    });
  }

  const [plan, setPlan] = useState(searchParams.get('plan') || 'plan_pro');
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>((searchParams.get('cycle') || 'monthly') as 'monthly' | 'yearly');
  const isVi = tc?.language === 'vi' || document.documentElement.lang === 'vi';

  // Detect downgrade vs upgrade
  const currentPlan = profile?.user_plan || 'plan_free';
  const currentRank = getPlanRank(currentPlan);
  const selectedRank = getPlanRank(plan);
  const isDowngrade = selectedRank < currentRank && currentPlan !== 'plan_free';
  const existingNextPlan = profile?.next_plan || null;

  const [step, setStep] = useState(1);
  const [addons, setAddons] = useState<Record<string, number>>(initialAddons);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<{ type: string; value: number; code: string } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(true);
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(true);
  const [orderReservation, setOrderReservation] = useState<{ orderId: string; expiresAt: string } | null>(null);
  const [orderExpired, setOrderExpired] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [creatingReservation, setCreatingReservation] = useState(false);

  useEffect(() => {
    supabase.functions.invoke('get-paypal-config').then(({ data }) => {
      if (data?.clientId) setPaypalClientId(data.clientId);
    });
  }, []);

  // Check if first-time buyer
  useEffect(() => {
    if (!user) return;
    supabase.from('orders').select('id').eq('user_id', user.id).eq('status', 'completed').limit(1)
      .then(({ data }) => {
        setIsFirstTimeBuyer(!data || data.length === 0);
      });
  }, [user]);

  useEffect(() => {
    setSearchParams({ plan, cycle }, { replace: true });
  }, [plan, cycle, setSearchParams]);

  useEffect(() => {
    if (couponDiscount) {
      setCouponDiscount(null);
      setCouponCode('');
      setCouponError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  // Price calculations — use welcome price if first-time buyer
  const prices = PLAN_PRICES[plan];
  const originalBaseAmount = prices ? (cycle === 'yearly' ? prices.yearly : prices.monthly) : 0;
  const welcomePrice = isFirstTimeBuyer ? (getWelcomePrice(plan, cycle) ?? originalBaseAmount) : originalBaseAmount;
  const baseAmount = welcomePrice;
  const welcomeDiscount = originalBaseAmount - baseAmount;
  const addonDiscountRate = ADDON_DISCOUNT_RATE[plan] || 0;

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

  const applyCoupon = useCallback(async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setCouponDiscount(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-coupon', {
        body: { code: couponCode.trim(), plan },
      });

      if (error || !data?.valid) {
        const errorKey = data?.error || 'invalid';
        const msg = COUPON_ERROR_MAP[errorKey];
        setCouponError(msg ? (isVi ? msg.vi : msg.en) : (t?.couponInvalid || 'Invalid coupon code'));
        setCouponLoading(false);
        return;
      }

      setCouponDiscount({ type: data.discount_type, value: data.discount_value, code: data.code });
      toast.success(t?.couponApplied || 'Coupon applied!');
    } catch {
      setCouponError(isVi ? 'Lỗi hệ thống' : 'System error');
    } finally {
      setCouponLoading(false);
    }
  }, [couponCode, plan, t, isVi]);

  // Create internal order reservation when entering Step 2
  const createReservation = useCallback(async () => {
    const addonsList = Object.entries(addons)
      .filter(([, qty]) => qty > 0)
      .map(([type, quantity]) => ({ type, quantity }));

    const { data, error } = await supabase.from('orders').insert({
      user_id: user!.id,
      plan,
      billing_cycle: cycle,
      order_type: 'plan',
      base_amount: originalBaseAmount,
      addon_amount: addonFinal,
      discount_amount: discountAmount + welcomeDiscount + addonSaving,
      welcome_discount: welcomeDiscount,
      total_amount: totalAmount,
      addons: addonsList as any,
      addons_applied: false,
      coupon_code: couponDiscount ? couponDiscount.code : null,
      coupon_applied: false,
      payment_method: 'paypal',
      status: 'pending',
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    }).select('id, expires_at, order_code').single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create order');
    }

    setOrderReservation({
      orderId: data.id,
      expiresAt: data.expires_at!,
    });
    setOrderExpired(false);
    return data.order_code;
  }, [user, plan, cycle, addons, originalBaseAmount, addonFinal, discountAmount, welcomeDiscount, addonSaving, totalAmount, couponDiscount]);

  const createSubscription = useCallback(async () => {
    const internalOrderId = orderReservation?.orderId;

    const addonsList = Object.entries(addons)
      .filter(([, qty]) => qty > 0)
      .map(([type, quantity]) => ({ type, quantity }));

    const res = await supabase.functions.invoke('create-paypal-order', {
      body: {
        plan,
        billing_cycle: cycle,
        addons: addonsList,
        coupon_code: couponDiscount ? couponDiscount.code : undefined,
        internal_order_id: internalOrderId,
      },
    });

    if (res.error || !res.data?.subscriptionID) {
      throw new Error(res.error?.message || 'Failed to create subscription');
    }

    return res.data.subscriptionID;
  }, [plan, cycle, addons, couponDiscount, orderReservation]);

  const onApprove = useCallback(async (data: { subscriptionID?: string; orderID?: string }) => {
    setPaymentStatus('processing');
    try {
      const res = await supabase.functions.invoke('capture-paypal-order', {
        body: { subscriptionID: data.subscriptionID },
      });

      if (res.error) {
        throw new Error(res.error?.message || 'Payment capture failed');
      }

      if (res.data?.success && !res.data?.pending) {
        setPaymentStatus('success');
        toast.success(t?.paymentSuccess || 'Payment successful!');
        await refreshProfile();
        // Use the order_code from reservation to navigate to summary
        const targetOrderCode = orderReservation?.orderId ? undefined : res.data.orderId;
        // Poll briefly to find the order_code if needed
        if (orderReservation?.orderId) {
          const { data: orderData } = await supabase.from('orders').select('order_code').eq('id', orderReservation.orderId).single();
          if (orderData?.order_code) {
            navigate(`/checkout/summary/${orderData.order_code}`, { replace: true });
          } else {
            navigate(`/checkout/result?status=success&order_id=${res.data.orderId || ''}`, { replace: true });
          }
        } else {
          navigate(`/checkout/result?status=success&order_id=${res.data.orderId || ''}`, { replace: true });
        }
      } else if (res.data?.success && res.data?.pending) {
        // Subscription approved but not ACTIVE yet — wait for webhook
        toast.success(isVi ? 'Đã xác nhận! Đang chờ PayPal kích hoạt...' : 'Confirmed! Waiting for PayPal activation...');
        // Start polling for completion
        if (orderReservation?.orderId) {
          const pollForCompletion = async () => {
            for (let i = 0; i < 15; i++) {
              await new Promise(r => setTimeout(r, 3000));
              const { data: od } = await supabase.from('orders').select('status, order_code').eq('id', orderReservation.orderId).single();
              if (od && od.status === 'completed') {
                setPaymentStatus('success');
                await refreshProfile();
                navigate(`/checkout/summary/${od.order_code}`, { replace: true });
                return;
              }
            }
          };
          pollForCompletion();
        }
      } else {
        throw new Error('Payment capture failed');
      }
    } catch {
      setPaymentStatus('failed');
      toast.error(t?.paymentFailed || 'Payment failed. Please try again.');
    }
  }, [navigate, t, refreshProfile, isVi, orderReservation]);

  if (!prices) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{t?.invalidPlan || 'Invalid plan selected'}</p>
      </div>
    );
  }

  if (paymentStatus === 'success' || paymentStatus === 'failed') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAddons = Object.values(addons).some(q => q > 0);
  const selectedPlanData = PLANS.find(p => p.key === plan);

  /* ═══════════════════════════════════════════════
     STEP 1: 2-column — Left: config | Right: summary
     Bottom: total + CTA
     ═══════════════════════════════════════════════ */
  if (step === 1) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t?.title || 'Checkout'}</h1>
            <p className="text-sm text-muted-foreground">
              {isVi ? 'Bước 1/3 — Chọn gói & tùy chỉnh' : 'Step 1/3 — Select plan & customize'}
            </p>
          </div>
        </div>

        {/* Welcome Offer Banner */}
        {isFirstTimeBuyer && welcomeDiscount > 0 && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-primary/10 to-violet-500/10 border border-emerald-500/20">
            <div className="text-center">
              <p className="font-bold text-sm">{isVi ? 'Ưu đãi chào mừng dành riêng cho bạn' : 'Welcome offer just for you'}</p>
              <p className="text-sm">{isVi ? '🎉 Giảm tối đa lên đến gần 20% cho gói đăng ký đầu tiên' : '🎉 Up to ~20% off your first subscription'}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{isVi ? '(Không áp dụng cho tiện ích bổ sung)' : '(Not applicable to add-ons)'}</p>
            </div>
          </div>
        )}

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* ── LEFT COLUMN: Config ── */}
          <div className="lg:col-span-3 space-y-5">
            {/* Plan Selector */}
            <Card>
              <CardContent className="pt-5 pb-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">{isVi ? 'Chọn gói' : 'Select Plan'}</h3>
                  {/* Billing cycle toggle */}
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

                {/* Plan cards - horizontal */}
                <div className="grid grid-cols-3 gap-2.5">
                  {PLANS.map(p => {
                    const originalPrice = cycle === 'yearly' ? p.yearly : p.monthly;
                    const wPrice = isFirstTimeBuyer ? (getWelcomePrice(p.key, cycle) ?? originalPrice) : originalPrice;
                    const showWelcome = wPrice !== originalPrice;
                    const isSelected = plan === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => setPlan(p.key)}
                        className={cn(
                          "relative p-3.5 rounded-xl border-2 text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        {p.popular && (
                          <Badge className="absolute -top-2 right-2 text-[10px] px-1.5 py-0">
                            {isVi ? 'Phổ biến' : 'Popular'}
                          </Badge>
                        )}
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">{p.label}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        <div className="flex items-baseline gap-0.5 flex-nowrap">
                          <span className={cn("text-lg font-bold", showWelcome && "text-emerald-600")}>${wPrice.toFixed(2)}</span>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            /{cycle === 'yearly' ? (isVi ? 'năm' : 'yr') : (isVi ? 'tháng' : 'mo')}
                          </span>
                        </div>
                        <div className={cn("text-[11px] mt-1 font-medium", p.addonDiscount > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                          Add-on {p.addonDiscount > 0 ? `-${p.addonDiscount * 100}%` : (isVi ? 'không giảm' : 'no discount')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Add-ons */}
            <Card>
              <CardContent className="pt-5 pb-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {t?.addons || 'Add-ons'}
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
              <CardContent className="pt-5 pb-5 space-y-2.5">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5" />
                  {t?.couponTitle || 'Discount Code'}
                </h3>
                <div className="flex gap-2">
                  <Input
                    placeholder={t?.couponPlaceholder || 'Enter code'}
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value); setCouponError(''); }}
                    className="flex-1 h-9"
                    disabled={!!couponDiscount}
                  />
                  {couponDiscount ? (
                    <Button variant="outline" size="sm" onClick={() => { setCouponDiscount(null); setCouponCode(''); }}>
                      {t?.removeCoupon || 'Remove'}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}>
                      {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (t?.applyCoupon || 'Apply')}
                    </Button>
                  )}
                </div>
                {couponError && <p className="text-xs text-destructive">{couponError}</p>}
                {couponDiscount && (
                  <Badge variant="secondary" className="text-emerald-600">
                    {couponDiscount.type === 'percentage' ? `-${couponDiscount.value}%` : `-$${couponDiscount.value.toFixed(2)}`} {t?.applied || 'applied'}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN: Order Summary ── */}
          <div className="lg:col-span-2">
            <Card className="sticky top-20">
              <CardContent className="pt-5 pb-5 space-y-4">
                <h3 className="text-base font-semibold">{t?.orderSummary || 'Order Summary'}</h3>
                <Separator />

                {/* Items - Tạm tính */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{getPlanLabel(plan)} Plan</span>
                    <span className="font-semibold">${originalBaseAmount.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {cycle === 'yearly' ? (t?.billedYearly || 'Billed yearly') : (t?.billedMonthly || 'Billed monthly')}
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

                {/* Subtotal line */}
                {(welcomeDiscount > 0 || addonSaving > 0 || discountAmount > 0) && (
                  <>
                    <Separator className="my-1" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{isVi ? 'Tạm tính' : 'Subtotal'}</span>
                      <span>${(originalBaseAmount + addonOriginal).toFixed(2)}</span>
                    </div>
                  </>
                )}

                {/* All discounts grouped */}
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

                {/* Total */}
                <div className="flex justify-between font-bold text-lg">
                  <span>{t?.total || 'Total'}</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>

                <p className="text-[11px] text-muted-foreground text-center">
                  {cycle === 'yearly'
                    ? (t?.yearlyNote || 'Billed once per year')
                    : (t?.monthlyNote || 'Billed once per month')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom CTA bar */}
        <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-t">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t?.total || 'Total'}</p>
              <p className="text-2xl font-bold">${totalAmount.toFixed(2)}</p>
            </div>
            <Button size="lg" className="gap-2 px-10 text-base" onClick={() => { setShowConfirmDialog(true); setAgreedToPolicy(false); }}>
              {isVi ? 'Thanh toán' : 'Continue to Pay'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Policy Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isVi ? 'Xác nhận trước khi thanh toán' : 'Confirm before payment'}</DialogTitle>
              <DialogDescription>
                {isVi ? 'Vui lòng xác nhận bạn đã đọc và đồng ý với các chính sách của chúng tôi.' : 'Please confirm you have read and agree to our policies.'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-start gap-3 py-4">
              <Checkbox
                id="policy-agree"
                checked={agreedToPolicy}
                onCheckedChange={(v) => setAgreedToPolicy(v === true)}
                className="mt-0.5"
              />
              <label htmlFor="policy-agree" className="text-sm leading-relaxed cursor-pointer">
                {isVi ? (
                  <>Tôi đã đọc và đồng ý với{' '}
                    <a href="/guide/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">Điều khoản dịch vụ</a>
                    {' '}và{' '}
                    <a href="/guide/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">Chính sách bảo mật</a>
                  </>
                ) : (
                  <>I have read and agree to the{' '}
                    <a href="/guide/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">Terms of Service</a>
                    {' '}and{' '}
                    <a href="/guide/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">Privacy Policy</a>
                  </>
                )}
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                {isVi ? 'Hủy' : 'Cancel'}
              </Button>
              <Button disabled={!agreedToPolicy || creatingReservation} onClick={async () => {
                setCreatingReservation(true);
                try {
                  const newOrderId = await createReservation();
                  sessionStorage.setItem('checkout_payment_return_path', window.location.pathname + window.location.search);
                  setShowConfirmDialog(false);
                  navigate('/checkout/payment/' + newOrderId);
                } catch (e) {
                  toast.error(isVi ? 'Không thể tạo đơn hàng. Vui lòng thử lại.' : 'Failed to create order. Please try again.');
                } finally {
                  setCreatingReservation(false);
                }
              }}>
                {creatingReservation && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {isVi ? 'Tiếp tục thanh toán' : 'Continue to Payment'}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* Step 2 is now a separate route: /checkout/:orderId */
  return null;
}
