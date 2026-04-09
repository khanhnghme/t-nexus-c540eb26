import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { ArrowLeft, Tag, Plus, Minus, ShieldCheck, CreditCard, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/* ═══ Constants ═══ */

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  plan_plus: { monthly: 4.8, yearly: 48 },
  plan_pro: { monthly: 12, yearly: 120 },
  plan_business: { monthly: 24, yearly: 240 },
};

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

/* ═══ Component ═══ */

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { translations: { checkout: t, common: tc } } = useLanguage();
  const { user } = useAuth();

  const plan = searchParams.get('plan') || 'plan_pro';
  const cycle = (searchParams.get('cycle') || 'monthly') as 'monthly' | 'yearly';
  const isVi = tc?.language === 'vi' || document.documentElement.lang === 'vi';

  const [addons, setAddons] = useState<Record<string, number>>({});
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<{ type: string; value: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);

  useEffect(() => {
    supabase.functions.invoke('get-paypal-config').then(({ data }) => {
      if (data?.clientId) setPaypalClientId(data.clientId);
    });
  }, []);

  // Calculate prices
  const prices = PLAN_PRICES[plan];
  const baseAmount = prices ? (cycle === 'yearly' ? prices.yearly : prices.monthly) : 0;

  const addonAmount = useMemo(() => {
    let total = 0;
    for (const [, qty] of Object.entries(addons)) {
      if (qty > 0) {
        total += cycle === 'yearly' ? ADDON_PRICE_MONTHLY * 10 * qty : ADDON_PRICE_MONTHLY * qty;
      }
    }
    return Math.round(total * 100) / 100;
  }, [addons, cycle]);

  const subtotal = baseAmount + addonAmount;

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

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase().trim())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      setCouponError(t?.couponInvalid || 'Invalid coupon code');
      setCouponLoading(false);
      return;
    }

    const now = new Date();
    if (data.expires_at && new Date(data.expires_at) < now) {
      setCouponError(t?.couponExpired || 'Coupon has expired');
      setCouponLoading(false);
      return;
    }
    if (data.starts_at && new Date(data.starts_at) > now) {
      setCouponError(t?.couponNotStarted || 'Coupon is not yet active');
      setCouponLoading(false);
      return;
    }
    if (data.max_uses !== null && data.used_count >= data.max_uses) {
      setCouponError(t?.couponMaxUses || 'Coupon usage limit reached');
      setCouponLoading(false);
      return;
    }
    if (data.applicable_plans?.length && !data.applicable_plans.includes(plan)) {
      setCouponError(t?.couponNotApplicable || 'Coupon not applicable to this plan');
      setCouponLoading(false);
      return;
    }

    setCouponDiscount({ type: data.discount_type, value: data.discount_value });
    toast.success(t?.couponApplied || 'Coupon applied!');
    setCouponLoading(false);
  }, [couponCode, plan, t]);

  const createOrder = useCallback(async () => {
    const addonsList = Object.entries(addons)
      .filter(([, qty]) => qty > 0)
      .map(([type, quantity]) => ({ type, quantity }));

    const res = await supabase.functions.invoke('create-paypal-order', {
      body: {
        plan,
        billing_cycle: cycle,
        addons: addonsList,
        coupon_code: couponDiscount ? couponCode.toUpperCase().trim() : undefined,
      },
    });

    if (res.error || !res.data?.orderID) {
      throw new Error(res.error?.message || 'Failed to create order');
    }

    return res.data.orderID;
  }, [plan, cycle, addons, couponCode, couponDiscount]);

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
    } catch (err) {
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

  if (paymentStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-2xl font-bold">{t?.successTitle || 'Payment Successful!'}</h2>
        <p className="text-muted-foreground">{t?.successMessage || 'Your plan has been upgraded. Redirecting...'}</p>
      </div>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <XCircle className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-bold">{t?.failedTitle || 'Payment Failed'}</h2>
        <p className="text-muted-foreground">{t?.failedMessage || 'Something went wrong. Please try again.'}</p>
        <Button onClick={() => setPaymentStatus('idle')}>{t?.tryAgain || 'Try Again'}</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{t?.title || 'Checkout'}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Order Details */}
        <div className="lg:col-span-3 space-y-6">
          {/* Plan Summary */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{PLAN_LABELS[plan] || plan} Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    {cycle === 'yearly' ? (t?.billedYearly || 'Billed yearly') : (t?.billedMonthly || 'Billed monthly')}
                  </p>
                </div>
                <span className="text-2xl font-bold">${baseAmount.toFixed(2)}</span>
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
              <p className="text-sm text-muted-foreground">{t?.addonsDesc || 'Extend your plan with extra capacity'}</p>
              <div className="space-y-3">
                {ADDON_TYPES.map(addon => {
                  const qty = addons[addon.type] || 0;
                  const unitPrice = cycle === 'yearly' ? ADDON_PRICE_MONTHLY * 10 : ADDON_PRICE_MONTHLY;
                  return (
                    <div key={addon.type} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{addon.emoji}</span>
                        <div>
                          <p className="font-medium text-sm">{isVi ? addon.unitLabelVi : addon.unitLabel}</p>
                          <p className="text-xs text-muted-foreground">${unitPrice.toFixed(2)}/{cycle === 'yearly' ? (isVi ? 'năm' : 'yr') : (isVi ? 'tháng' : 'mo')}</p>
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
        </div>

        {/* Right: Price Summary + Payment */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="sticky top-24">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-semibold">{t?.orderSummary || 'Order Summary'}</h3>
              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{PLAN_LABELS[plan]} Plan</span>
                  <span>${baseAmount.toFixed(2)}</span>
                </div>
                {addonAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t?.addonsLabel || 'Add-ons'}</span>
                    <span>+${addonAmount.toFixed(2)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{t?.discount || 'Discount'}</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between font-bold text-lg">
                <span>{t?.total || 'Total'}</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {cycle === 'yearly'
                  ? (t?.yearlyNote || 'Billed once per year')
                  : (t?.monthlyNote || 'Billed once per month')}
              </p>

              <Separator />

              {/* Payment Method */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
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

                {/* Momo - Coming Soon */}
                <Button variant="outline" className="w-full opacity-50 cursor-not-allowed" disabled>
                  <span className="mr-2">🟣</span> MoMo — {t?.comingSoon || 'Coming soon'}
                </Button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2">
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
