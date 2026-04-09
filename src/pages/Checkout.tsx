import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { ArrowLeft, ArrowRight, Tag, Plus, Minus, ShieldCheck, CreditCard, Loader2, Check, ChevronDown } from 'lucide-react';
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

/* ═══ Constants ═══ */

const PLANS = [
  { key: 'plan_plus', label: 'Plus', monthly: 4.8, yearly: 48, addonDiscount: 0.10 },
  { key: 'plan_pro', label: 'Pro', monthly: 12, yearly: 120, addonDiscount: 0.20, popular: true },
  { key: 'plan_business', label: 'Business', monthly: 24, yearly: 240, addonDiscount: 0.20 },
];

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {};
const ADDON_DISCOUNT_RATE: Record<string, number> = {};
PLANS.forEach(p => {
  PLAN_PRICES[p.key] = { monthly: p.monthly, yearly: p.yearly };
  ADDON_DISCOUNT_RATE[p.key] = p.addonDiscount;
});

const PLAN_LABELS: Record<string, string> = {
  plan_plus: 'Plus',
  plan_pro: 'Pro',
  plan_business: 'Business',
};

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

  useEffect(() => {
    supabase.functions.invoke('get-paypal-config').then(({ data }) => {
      if (data?.clientId) setPaypalClientId(data.clientId);
    });
  }, []);

  // Sync URL params when plan/cycle changes
  useEffect(() => {
    setSearchParams({ plan, cycle }, { replace: true });
  }, [plan, cycle, setSearchParams]);

  // Clear coupon when plan changes (may no longer be applicable)
  useEffect(() => {
    if (couponDiscount) {
      setCouponDiscount(null);
      setCouponCode('');
      setCouponError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  // Price calculations
  const prices = PLAN_PRICES[plan];
  const baseAmount = prices ? (cycle === 'yearly' ? prices.yearly : prices.monthly) : 0;
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

  /* ═══ STEP 1: Plan Selection + Summary ═══ */
  if (step === 1) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t?.title || 'Checkout'}</h1>
            <p className="text-sm text-muted-foreground">{isVi ? 'Bước 1/2 — Chọn gói & tùy chỉnh' : 'Step 1/2 — Select plan & customize'}</p>
          </div>
        </div>

        {/* Plan Selector */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-lg font-semibold">{isVi ? 'Chọn gói' : 'Select Plan'}</h3>
            
            {/* Billing cycle toggle */}
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setCycle('monthly')}
                className={cn(
                  "px-3 py-1.5 rounded-full transition-colors",
                  cycle === 'monthly' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {isVi ? 'Hàng tháng' : 'Monthly'}
              </button>
              <button
                onClick={() => setCycle('yearly')}
                className={cn(
                  "px-3 py-1.5 rounded-full transition-colors",
                  cycle === 'yearly' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {isVi ? 'Hàng năm' : 'Yearly'}
                <span className="ml-1 text-xs opacity-75">{isVi ? '(tiết kiệm 17%)' : '(save 17%)'}</span>
              </button>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PLANS.map(p => {
                const price = cycle === 'yearly' ? p.yearly : p.monthly;
                const isSelected = plan === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setPlan(p.key)}
                    className={cn(
                      "relative p-4 rounded-xl border-2 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    {p.popular && (
                      <Badge className="absolute -top-2.5 right-3 text-[10px]">
                        {isVi ? 'Phổ biến' : 'Popular'}
                      </Badge>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{p.label}</span>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="text-xl font-bold">${price.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      /{cycle === 'yearly' ? (isVi ? 'năm' : 'year') : (isVi ? 'tháng' : 'month')}
                    </div>
                    {p.addonDiscount > 0 && (
                      <div className="text-xs text-green-600 mt-1">
                        Add-on: -{p.addonDiscount * 100}%
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Add-ons */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t?.addons || 'Add-ons'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t?.addonsDesc || 'Extend your plan with extra capacity'}
              {addonDiscountRate > 0 && (
                <span className="text-green-600 font-medium ml-1">
                  ({isVi ? `Giảm ${addonDiscountRate * 100}% với gói ${PLAN_LABELS[plan]}` : `${addonDiscountRate * 100}% off with ${PLAN_LABELS[plan]}`})
                </span>
              )}
            </p>
            <div className="space-y-3">
              {ADDON_TYPES.map(addon => {
                const qty = addons[addon.type] || 0;
                const unitPriceOriginal = cycle === 'yearly' ? ADDON_PRICE_MONTHLY * 10 : ADDON_PRICE_MONTHLY;
                const unitPriceFinal = Math.round(unitPriceOriginal * (1 - addonDiscountRate) * 100) / 100;
                const hasDiscount = addonDiscountRate > 0;
                return (
                  <div key={addon.type} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{addon.emoji}</span>
                      <div>
                        <p className="font-medium text-sm">{isVi ? addon.unitLabelVi : addon.unitLabel}</p>
                        <div className="flex items-center gap-1.5 text-xs">
                          {hasDiscount && (
                            <span className="text-muted-foreground line-through">${unitPriceOriginal.toFixed(2)}</span>
                          )}
                          <span className={hasDiscount ? "text-green-600 font-medium" : "text-muted-foreground"}>
                            ${unitPriceFinal.toFixed(2)}
                          </span>
                          <span className="text-muted-foreground">/{cycle === 'yearly' ? (isVi ? 'năm' : 'yr') : (isVi ? 'tháng' : 'mo')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateAddon(addon.type, -1)} disabled={qty === 0}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center font-medium text-sm">{qty}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateAddon(addon.type, 1)} disabled={qty >= 10}>
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
          <CardContent className="pt-6 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4" />
              {t?.couponTitle || 'Discount Code'}
            </h3>
            <div className="flex gap-2">
              <Input
                placeholder={t?.couponPlaceholder || 'Enter code'}
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value); setCouponError(''); }}
                className="flex-1"
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
              <Badge variant="secondary" className="text-green-600">
                {couponDiscount.type === 'percentage' ? `-${couponDiscount.value}%` : `-$${couponDiscount.value.toFixed(2)}`} {t?.applied || 'applied'}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Summary + CTA */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t?.total || 'Total'}</p>
                <div className="text-3xl font-bold">${totalAmount.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cycle === 'yearly'
                    ? (t?.yearlyNote || 'Billed once per year')
                    : (t?.monthlyNote || 'Billed once per month')}
                </p>
              </div>
              <Button size="lg" className="gap-2 px-8" onClick={() => setStep(2)}>
                {isVi ? 'Thanh toán' : 'Pay'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ═══ STEP 2: Order Details + Payment ═══ */
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setStep(1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isVi ? 'Xác nhận & Thanh toán' : 'Confirm & Pay'}</h1>
          <p className="text-sm text-muted-foreground">{isVi ? 'Bước 2/2 — Kiểm tra và thanh toán' : 'Step 2/2 — Review and pay'}</p>
        </div>
      </div>

      {/* Order Details */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-lg font-semibold">{t?.orderSummary || 'Order Summary'}</h3>
          <Separator />

          {/* Plan line */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">{PLAN_LABELS[plan]} Plan</p>
              <p className="text-xs text-muted-foreground">
                {cycle === 'yearly' ? (t?.billedYearly || 'Billed yearly') : (t?.billedMonthly || 'Billed monthly')}
              </p>
            </div>
            <span className="font-semibold">${baseAmount.toFixed(2)}</span>
          </div>

          {/* Addon lines */}
          {hasAddons && (
            <>
              <Separator className="my-2" />
              <p className="text-sm font-medium text-muted-foreground">{t?.addonsLabel || 'Add-ons'}</p>
              {ADDON_TYPES.map(addon => {
                const qty = addons[addon.type] || 0;
                if (qty === 0) return null;
                const unitOriginal = cycle === 'yearly' ? ADDON_PRICE_MONTHLY * 10 : ADDON_PRICE_MONTHLY;
                const unitFinal = Math.round(unitOriginal * (1 - addonDiscountRate) * 100) / 100;
                const lineTotal = Math.round(unitFinal * qty * 100) / 100;
                return (
                  <div key={addon.type} className="flex justify-between items-center text-sm pl-2">
                    <div className="flex items-center gap-2">
                      <span>{addon.emoji}</span>
                      <span>{isVi ? addon.unitLabelVi : addon.unitLabel}</span>
                      <span className="text-muted-foreground">× {qty}</span>
                    </div>
                    <div className="text-right">
                      {addonDiscountRate > 0 && (
                        <span className="text-xs text-muted-foreground line-through mr-2">
                          ${(unitOriginal * qty).toFixed(2)}
                        </span>
                      )}
                      <span className={addonDiscountRate > 0 ? "text-green-600 font-medium" : ""}>
                        ${lineTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {addonSaving > 0 && (
                <div className="flex justify-between text-xs text-green-600 pl-2">
                  <span>{isVi ? `Tiết kiệm add-on (${addonDiscountRate * 100}%)` : `Add-on savings (${addonDiscountRate * 100}%)`}</span>
                  <span>-${addonSaving.toFixed(2)}</span>
                </div>
              )}
            </>
          )}

          {/* Coupon discount */}
          {discountAmount > 0 && (
            <>
              <Separator className="my-2" />
              <div className="flex justify-between text-sm text-green-600">
                <span className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  {t?.discount || 'Discount'} ({couponDiscount?.code})
                </span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            </>
          )}

          <Separator />

          {/* Total */}
          <div className="flex justify-between font-bold text-lg">
            <span>{t?.total || 'Total'}</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h4 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {t?.paymentMethod || 'Payment Method'}
          </h4>

          {paymentStatus === 'processing' ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm text-muted-foreground">{t?.processing || 'Processing payment...'}</span>
            </div>
          ) : paypalClientId ? (
            <PayPalScriptProvider options={{ clientId: paypalClientId, currency: 'USD' }}>
              <PayPalButtons
                style={{ layout: 'vertical', shape: 'rect', label: 'pay' }}
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

          {/* Momo */}
          <Button variant="outline" className="w-full opacity-50 cursor-not-allowed" disabled>
            <span className="mr-2">🟣</span> MoMo — {t?.comingSoon || 'Coming soon'}
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t?.securePayment || 'Secure payment powered by PayPal'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
