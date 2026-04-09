import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { ArrowLeft, ArrowRight, Tag, Plus, Minus, ShieldCheck, CreditCard, Loader2, Check, Package, ChevronDown, ChevronUp } from 'lucide-react';
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

import { PLAN_CONFIG, getPlanLabel, getWelcomePrice, type PlanKey, PLAN_ORDER } from '@/lib/planConfig';

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
  const { user } = useAuth();

  const [plan, setPlan] = useState(searchParams.get('plan') || 'plan_pro');
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>((searchParams.get('cycle') || 'monthly') as 'monthly' | 'yearly');
  const isVi = tc?.language === 'vi' || document.documentElement.lang === 'vi';

  const [step, setStep] = useState(1);
  const [addons, setAddons] = useState<Record<string, number>>({});
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<{ type: string; value: number; code: string } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(true);
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(true);

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

  const createOrder = useCallback(async () => {
    const addonsList = Object.entries(addons)
      .filter(([, qty]) => qty > 0)
      .map(([type, quantity]) => ({ type, quantity }));

    const res = await supabase.functions.invoke('create-paypal-order', {
      body: {
        plan,
        billing_cycle: cycle,
        addons: addonsList,
        coupon_code: couponDiscount ? couponDiscount.code : undefined,
      },
    });

    if (res.error || !res.data?.orderID) {
      throw new Error(res.error?.message || 'Failed to create order');
    }

    return res.data.orderID;
  }, [plan, cycle, addons, couponDiscount]);

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
      toast.success(t?.paymentSuccess || 'Payment successful!');
      navigate(`/checkout/result?status=success&order_id=${res.data.orderId || ''}`);
    } catch {
      setPaymentStatus('failed');
      toast.error(t?.paymentFailed || 'Payment failed. Please try again.');
      navigate('/checkout/result?status=failed');
    }
  }, [navigate, t]);

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
              {isVi ? 'Bước 1/2 — Chọn gói & tùy chỉnh' : 'Step 1/2 — Select plan & customize'}
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
                        {showWelcome && <span className="text-sm text-muted-foreground line-through">${originalPrice.toFixed(2)}</span>}
                        <div className="flex items-baseline gap-0.5 flex-nowrap">
                          <span className="text-lg font-bold">${wPrice.toFixed(2)}</span>
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
                  {addonDiscountRate > 0 && (
                    <Badge variant="secondary" className="text-emerald-600 text-[11px]">
                      -{addonDiscountRate * 100}% {isVi ? 'với' : 'with'} {getPlanLabel(plan)}
                    </Badge>
                  )}
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

                {/* Plan */}
                <div className="flex justify-between items-start text-sm">
                  <div>
                    <p className="font-medium">{getPlanLabel(plan)} Plan</p>
                    <p className="text-[11px] text-muted-foreground">
                      {cycle === 'yearly' ? (t?.billedYearly || 'Billed yearly') : (t?.billedMonthly || 'Billed monthly')}
                    </p>
                  </div>
                  <span className="font-semibold">${baseAmount.toFixed(2)}</span>
                </div>

                {/* Addons */}
                {hasAddons && (
                  <div className="space-y-1.5">
                    {ADDON_TYPES.map(addon => {
                      const qty = addons[addon.type] || 0;
                      if (qty === 0) return null;
                      const unitOriginal = cycle === 'yearly' ? ADDON_PRICE_MONTHLY * 10 : ADDON_PRICE_MONTHLY;
                      const unitFinal = Math.round(unitOriginal * (1 - addonDiscountRate) * 100) / 100;
                      return (
                        <div key={addon.type} className="flex justify-between text-sm text-muted-foreground">
                          <span>{addon.emoji} {isVi ? addon.unitLabelVi : addon.unitLabel} ×{qty}</span>
                          <span>${(unitFinal * qty).toFixed(2)}</span>
                        </div>
                      );
                    })}
                    {addonSaving > 0 && (
                      <div className="flex justify-between text-[11px] text-emerald-600">
                        <span>{isVi ? 'Tiết kiệm add-on' : 'Add-on savings'}</span>
                        <span>-${addonSaving.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Coupon */}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {couponDiscount?.code}
                    </span>
                    <span>-${discountAmount.toFixed(2)}</span>
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
            <Button size="lg" className="gap-2 px-10 text-base" onClick={() => setStep(2)}>
              {isVi ? 'Thanh toán' : 'Continue to Pay'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════
     STEP 2: Top: order summary | Bottom: 2 cols (payment method + pay box)
     No quantity editing
     ═══════════════════════════════════════════════ */
  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setStep(1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isVi ? 'Xác nhận & Thanh toán' : 'Confirm & Pay'}</h1>
          <p className="text-sm text-muted-foreground">
            {isVi ? 'Bước 2/2 — Kiểm tra và thanh toán' : 'Step 2/2 — Review and pay'}
          </p>
        </div>
      </div>

      {/* ── TOP: Order Summary Table ── */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <h3 className="text-base font-semibold mb-4">{t?.orderSummary || 'Order Summary'}</h3>

          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
            <div className="col-span-6">{isVi ? 'Sản phẩm' : 'Item'}</div>
            <div className="col-span-2 text-right">{isVi ? 'Đơn giá' : 'Price'}</div>
            <div className="col-span-2 text-center">{isVi ? 'SL' : 'Qty'}</div>
            <div className="col-span-2 text-right">{isVi ? 'Thành tiền' : 'Total'}</div>
          </div>

          {/* Plan row */}
          <div className="grid grid-cols-12 gap-2 items-center py-3 text-sm border-b border-dashed">
            <div className="col-span-6">
              <p className="font-medium">{getPlanLabel(plan)} Plan</p>
              <p className="text-[11px] text-muted-foreground">
                {cycle === 'yearly' ? (t?.billedYearly || 'Billed yearly') : (t?.billedMonthly || 'Billed monthly')}
              </p>
            </div>
            <div className="col-span-2 text-right text-muted-foreground">${baseAmount.toFixed(2)}</div>
            <div className="col-span-2 text-center text-muted-foreground">1</div>
            <div className="col-span-2 text-right font-medium">${baseAmount.toFixed(2)}</div>
          </div>

          {/* Addon rows */}
          {ADDON_TYPES.map(addon => {
            const qty = addons[addon.type] || 0;
            if (qty === 0) return null;
            const unitOriginal = cycle === 'yearly' ? ADDON_PRICE_MONTHLY * 10 : ADDON_PRICE_MONTHLY;
            const unitFinal = Math.round(unitOriginal * (1 - addonDiscountRate) * 100) / 100;
            const lineTotal = Math.round(unitFinal * qty * 100) / 100;
            return (
              <div key={addon.type} className="grid grid-cols-12 gap-2 items-center py-2.5 text-sm border-b border-dashed">
                <div className="col-span-6 flex items-center gap-2">
                  <span>{addon.emoji}</span>
                  <span>{isVi ? addon.unitLabelVi : addon.unitLabel}</span>
                </div>
                <div className="col-span-2 text-right">
                  {addonDiscountRate > 0 && (
                    <span className="text-[11px] text-muted-foreground line-through mr-1">${unitOriginal.toFixed(2)}</span>
                  )}
                  <span className={addonDiscountRate > 0 ? "text-emerald-600" : "text-muted-foreground"}>${unitFinal.toFixed(2)}</span>
                </div>
                <div className="col-span-2 text-center text-muted-foreground">{qty}</div>
                <div className="col-span-2 text-right font-medium">${lineTotal.toFixed(2)}</div>
              </div>
            );
          })}

          {/* Subtotal / Discount / Total */}
          <div className="pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{isVi ? 'Tạm tính' : 'Subtotal'}</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
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
              <span>{t?.total || 'Total'}</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── BOTTOM: 2-column — Payment Method | Pay Box ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: Payment Methods */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-5 pb-5 space-y-4">
              <h4 className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {t?.paymentMethod || 'Payment Method'}
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
                        <span className="text-sm text-muted-foreground">{t?.processing || 'Processing payment...'}</span>
                      </div>
                    ) : paypalClientId ? (
                      <PayPalScriptProvider options={{ clientId: paypalClientId, currency: 'USD' }}>
                        <PayPalButtons
                          style={{ layout: 'vertical', shape: 'rect', label: 'pay', height: 40 }}
                          createOrder={async () => createOrder()}
                          onApprove={async (data) => onApprove(data)}
                          onError={(err) => {
                            console.error('PayPal error:', err);
                            toast.error(t?.paypalError || 'PayPal encountered an error');
                          }}
                          onCancel={() => {
                            toast.info(t?.paypalCancelled || 'Payment cancelled');
                          }}
                        />
                      </PayPalScriptProvider>
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        {t?.paypalNotConfigured || 'Payment system is being configured. Please try again later.'}
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
                  <Badge variant="outline" className="text-[10px] ml-auto">{t?.comingSoon || 'Coming soon'}</Badge>
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
                    ? (t?.yearlyNote || 'Billed once per year')
                    : (t?.monthlyNote || 'Billed once per month')}
                </p>
              </div>

              <Separator />

              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>{getPlanLabel(plan)} Plan</span>
                  <span>${baseAmount.toFixed(2)}</span>
                </div>
                {addonFinal > 0 && (
                  <div className="flex justify-between">
                    <span>Add-ons</span>
                    <span>${addonFinal.toFixed(2)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>{isVi ? 'Giảm giá' : 'Discount'}</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t?.securePayment || 'Secure payment powered by PayPal'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
