import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { ShieldCheck, CreditCard, Loader2, ChevronDown, ChevronUp, AlertTriangle, Tag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { OrderCountdown } from '@/components/OrderCountdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getPlanLabel } from '@/lib/planConfig';

const ADDON_PRICE_MONTHLY = 2.49;

const ADDON_TYPES = [
  { type: 'projects', emoji: '📁', unitLabel: '+5 projects', unitLabelVi: '+5 dự án' },
  { type: 'storage', emoji: '💾', unitLabel: '+5 GB storage', unitLabelVi: '+5 GB lưu trữ' },
  { type: 'members', emoji: '👥', unitLabel: '+5 members', unitLabelVi: '+5 thành viên' },
] as const;

export default function CheckoutPayment() {
  const { orderCode } = useParams<{ orderCode: string }>();
  const navigate = useNavigate();
  const { translations: { checkout: t, common: tc } } = useLanguage();
  const { user, refreshProfile } = useAuth();

  const isVi = tc?.language === 'vi' || document.documentElement.lang === 'vi';

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orderExpired, setOrderExpired] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);

  // Background polling: detect webhook-completed orders
  useEffect(() => {
    if (!user || !orderCode || paymentStatus === 'success') return;
    // Poll when idle, processing, or failed (webhook may still complete)
    if (paymentStatus !== 'idle' && paymentStatus !== 'processing' && paymentStatus !== 'failed') return;

    const interval = setInterval(async () => {
      const { data } = await supabase.from('orders').select('status').eq('order_code', orderCode).eq('user_id', user.id).maybeSingle();
      if (data && data.status === 'completed') {
        clearInterval(interval);
        setPaymentStatus('success');
        await refreshProfile();
        navigate(`/checkout/summary/${orderCode}`, { replace: true });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [user, orderCode, paymentStatus, navigate, refreshProfile]);

  // Load order + paypal config
  useEffect(() => {
    if (!user || !orderCode) return;

    Promise.all([
      supabase.from('orders').select('*').eq('order_code', orderCode).eq('user_id', user.id).single(),
      supabase.functions.invoke('get-paypal-config'),
    ]).then(([orderRes, paypalRes]) => {
      if (orderRes.error || !orderRes.data) {
        navigate('/billing-history', { replace: true });
        return;
      }
      setOrder(orderRes.data);
      if (paypalRes.data?.clientId) setPaypalClientId(paypalRes.data.clientId);

      const o = orderRes.data;
      // If order is finished, redirect to summary
      if (['completed', 'cancelled', 'expired'].includes(o.status)) {
        navigate(`/checkout/summary/${orderCode}`, { replace: true });
        return;
      }
      // If failed, stay on payment page to allow retry
      if (o.status === 'failed') {
        setPaymentStatus('failed');
        setPaymentError(isVi ? 'Thanh toán trước đó thất bại. Vui lòng thử lại.' : 'Previous payment failed. Please try again.');
      }
      if (o.expires_at && new Date(o.expires_at).getTime() <= Date.now() && o.status === 'pending') {
        setOrderExpired(true);
      }
      setLoading(false);
    });
  }, [user, orderCode, navigate]);

  // Derived values from order
  const plan = order?.plan || '';
  const cycle = order?.billing_cycle || 'monthly';
  const originalBaseAmount = order?.base_amount || 0;
  const totalAmount = order?.total_amount || 0;
  const welcomeDiscount = order?.welcome_discount || 0;
  const discountAmount = order?.discount_amount || 0;
  const addons: { type: string; quantity: number }[] = Array.isArray(order?.addons) ? order.addons : [];
  const couponCode = order?.coupon_code || null;
  const addonDiscountRate = plan === 'plan_business' ? 0.2 : plan === 'plan_pro' ? 0.1 : 0;

  // Compute addon totals
  const addonOriginal = addons.reduce((sum, a) => {
    const unitPrice = cycle === 'yearly' ? ADDON_PRICE_MONTHLY * 10 : ADDON_PRICE_MONTHLY;
    return sum + unitPrice * a.quantity;
  }, 0);
  const addonSaving = Math.round(addonOriginal * addonDiscountRate * 100) / 100;
  // The discount_amount in the order includes welcome + addon saving + coupon
  // We need to separate coupon discount
  const couponDiscount = Math.max(0, discountAmount - welcomeDiscount - addonSaving);

  const createSubscription = useCallback(async () => {
    const res = await supabase.functions.invoke('create-paypal-order', {
      body: {
        plan,
        billing_cycle: cycle,
        addons,
        coupon_code: couponCode || undefined,
        internal_order_id: order?.id,
      },
    });

    if (res.error || !res.data?.subscriptionID) {
      throw new Error(res.error?.message || 'Failed to create subscription');
    }
    return res.data.subscriptionID;
  }, [plan, cycle, addons, couponCode, order]);

  const pollOrderStatus = useCallback(async (code: string, maxAttempts = 10, interval = 2000) => {
    for (let i = 0; i < maxAttempts; i++) {
      const { data } = await supabase.from('orders').select('status').eq('order_code', code).maybeSingle();
      if (data && data.status !== 'pending') return data.status;
      await new Promise(r => setTimeout(r, interval));
    }
    return null;
  }, []);

  const onApprove = useCallback(async (data: { subscriptionID?: string; orderID?: string }) => {
    setPaymentStatus('processing');
    setPaymentError(null);
    try {
      const res = await supabase.functions.invoke('capture-paypal-order', {
        body: { subscriptionID: data.subscriptionID },
      });
      if (res.error) {
        throw new Error(res.error?.message || 'Payment capture failed');
      }
      if (res.data?.success && !res.data?.pending) {
        // Fully completed
        setPaymentStatus('success');
        toast.success(t?.paymentSuccess || 'Payment successful!');
        await refreshProfile();
        navigate(`/checkout/summary/${orderCode}`, { replace: true });
      } else if (res.data?.success && res.data?.pending) {
        // Subscription approved but not yet ACTIVE — let polling handle it
        toast.success(isVi ? 'Đã xác nhận! Đang chờ PayPal kích hoạt...' : 'Confirmed! Waiting for PayPal activation...');
        // Stay in processing state, background polling will navigate when completed
      } else {
        throw new Error('Payment capture failed');
      }
    } catch (err: any) {
      setPaymentStatus('failed');
      setPaymentError(err.message || (isVi ? 'Thanh toán thất bại. Vui lòng thử lại.' : 'Payment failed. Please try again.'));
      toast.error(t?.paymentFailed || 'Payment failed. Please try again.');
    }
  }, [navigate, t, refreshProfile, orderCode, isVi]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (paymentStatus === 'processing') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [paymentStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) return null;

  const hasAddons = addons.length > 0;

  if (paymentStatus === 'processing') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-5 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold">
                {isVi ? 'Đang xác nhận thanh toán với PayPal' : 'Confirming payment with PayPal'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isVi ? 'Hệ thống đang xác minh giao dịch của bạn...' : 'The system is verifying your transaction...'}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{isVi ? 'Vui lòng không thoát hoặc tải lại trang' : 'Please do not leave or reload this page'}</span>
            </div>
            <div className="w-full space-y-2">
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div className="h-full w-1/2 rounded-full bg-primary animate-pulse" style={{ animation: 'pulse 1.5s ease-in-out infinite, slideRight 2s ease-in-out infinite' }} />
              </div>
              <p className="text-xs text-muted-foreground">
                {isVi ? 'Mã đơn hàng:' : 'Order ID:'}{' '}
                <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{order?.order_code || orderCode}</code>
              </p>
            </div>
          </CardContent>
        </Card>
        <style>{`
          @keyframes slideRight {
            0%, 100% { transform: translateX(-60%); }
            50% { transform: translateX(120%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isVi ? 'Xác nhận & Thanh toán' : 'Confirm & Pay'}</h1>
          <p className="text-sm text-muted-foreground">
            {isVi ? 'Bước 2/3 — Kiểm tra và thanh toán' : 'Step 2/3 — Review and pay'}
          </p>
        </div>
        {!orderExpired && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            disabled={cancellingOrder}
            onClick={() => setShowCancelDialog(true)}
          >
            {cancellingOrder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {isVi ? 'Hủy đơn hàng' : 'Cancel Order'}
          </Button>
        )}
      </div>

      {/* Payment failure banner */}
      {paymentStatus === 'failed' && paymentError && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-destructive">{isVi ? 'Thanh toán thất bại' : 'Payment Failed'}</p>
            <p className="text-sm text-muted-foreground mt-1">{paymentError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => { setPaymentStatus('idle'); setPaymentError(null); }}
            >
              {isVi ? 'Thử lại' : 'Try Again'}
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isVi ? 'Xác nhận hủy đơn hàng' : 'Cancel Order?'}</DialogTitle>
            <DialogDescription>
              {isVi
                ? 'Bạn có chắc muốn hủy đơn hàng này? Hành động này không thể hoàn tác.'
                : 'Are you sure you want to cancel this order? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              {isVi ? 'Quay lại' : 'Go back'}
            </Button>
            <Button
              variant="destructive"
              disabled={cancellingOrder}
              onClick={async () => {
                setCancellingOrder(true);
                try {
                  await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order?.id);
                  toast.success(isVi ? 'Đơn hàng đã được hủy' : 'Order has been cancelled');
                  setShowCancelDialog(false);
                  navigate('/billing-history', { replace: true });
                } catch {
                  toast.error(isVi ? 'Không thể hủy đơn hàng' : 'Failed to cancel order');
                } finally {
                  setCancellingOrder(false);
                }
              }}
            >
              {cancellingOrder && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              {isVi ? 'Xác nhận hủy' : 'Confirm Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Summary Table */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">{t?.orderSummary || 'Order Summary'}</h3>
            <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{order?.order_code || orderCode}</code>
          </div>

          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
            <div className="col-span-6">{isVi ? 'Sản phẩm' : 'Item'}</div>
            <div className="col-span-2 text-right">{isVi ? 'Đơn giá' : 'Price'}</div>
            <div className="col-span-2 text-center">{isVi ? 'SL' : 'Qty'}</div>
            <div className="col-span-2 text-right">{isVi ? 'Thành tiền' : 'Total'}</div>
          </div>

          {/* Plan row */}
          {plan && (
            <div className="grid grid-cols-12 gap-2 items-center py-3 text-sm border-b border-dashed">
              <div className="col-span-6">
                <p className="font-medium">{getPlanLabel(plan)} Plan</p>
                <p className="text-[11px] text-muted-foreground">
                  {cycle === 'yearly' ? (t?.billedYearly || 'Billed yearly') : (t?.billedMonthly || 'Billed monthly')}
                </p>
              </div>
              <div className="col-span-2 text-right text-muted-foreground">${originalBaseAmount.toFixed(2)}</div>
              <div className="col-span-2 text-center text-muted-foreground">1</div>
              <div className="col-span-2 text-right font-medium">${originalBaseAmount.toFixed(2)}</div>
            </div>
          )}

          {/* Addon rows */}
          {addons.map(addon => {
            const meta = ADDON_TYPES.find(a => a.type === addon.type);
            const unitOriginal = cycle === 'yearly' ? ADDON_PRICE_MONTHLY * 10 : ADDON_PRICE_MONTHLY;
            const lineTotal = unitOriginal * addon.quantity;
            return (
              <div key={addon.type} className="grid grid-cols-12 gap-2 items-center py-2.5 text-sm border-b border-dashed">
                <div className="col-span-6 flex items-center gap-2">
                  <span>{meta?.emoji || '📦'}</span>
                  <span>{isVi ? (meta?.unitLabelVi || addon.type) : (meta?.unitLabel || addon.type)}</span>
                </div>
                <div className="col-span-2 text-right text-muted-foreground">${unitOriginal.toFixed(2)}</div>
                <div className="col-span-2 text-center text-muted-foreground">{addon.quantity}</div>
                <div className="col-span-2 text-right font-medium">${lineTotal.toFixed(2)}</div>
              </div>
            );
          })}

          {/* Totals */}
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
            {couponDiscount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {isVi ? 'Mã giảm giá' : 'Coupon'} {couponCode && `(${couponCode})`}
                </span>
                <span>-${couponDiscount.toFixed(2)}</span>
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

      {/* Payment */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-5 pb-5 space-y-4">
              <h4 className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {t?.paymentMethod || 'Payment Method'}
              </h4>

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
                    {orderExpired ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <p className="text-sm text-destructive font-medium">
                          {isVi ? 'Đơn hàng đã hết hạn. Vui lòng tạo đơn mới.' : 'Order expired. Please create a new order.'}
                        </p>
                        <Button variant="outline" size="sm" onClick={() => navigate('/checkout?plan=' + plan + '&cycle=' + cycle)}>
                          {isVi ? 'Tạo đơn mới' : 'Create new order'}
                        </Button>
                      </div>
                    ) : paypalClientId ? (
                      <PayPalScriptProvider options={{ clientId: paypalClientId, currency: 'USD', vault: true, intent: 'subscription' }}>
                        <PayPalButtons
                          style={{ layout: 'vertical', shape: 'rect', label: 'subscribe', height: 40 }}
                          createSubscription={async () => createSubscription()}
                          onApprove={async (data) => onApprove(data)}
                          onError={(err) => {
                            const errStr = String(err);
                            if (errStr.includes('popup close') || errStr.includes('Window is closed')) {
                              console.warn('PayPal popup closed (may be normal after approval):', errStr);
                              return;
                            }
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

        {/* Pay Box */}
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
              {/* Countdown integrated */}
              {order.expires_at && !orderExpired && (
                <OrderCountdown
                  expiresAt={order.expires_at}
                  orderId={order.id}
                  orderCode={order.order_code}
                  isVi={isVi}
                  onExpired={() => setOrderExpired(true)}
                  onCreateNew={() => navigate('/checkout?plan=' + plan + '&cycle=' + cycle)}
                />
              )}
              {orderExpired && (
                <div className="text-center text-sm text-destructive font-medium">
                  {isVi ? 'Đơn hàng đã hết hạn' : 'Order has expired'}
                </div>
              )}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1">
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
