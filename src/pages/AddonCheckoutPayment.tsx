import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { ShieldCheck, CreditCard, Loader2, ChevronDown, ChevronUp, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserAddons } from '@/hooks/useUserAddons';
import { useAccountLimitsCheck } from '@/hooks/useAccountLimitsCheck';
import { supabase } from '@/integrations/supabase/client';
import { formatPlanName } from '@/hooks/useWorkspaceBilling';
import { OrderCountdown } from '@/components/OrderCountdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const BASE_PRICE = 2.49;

const ADDON_META: Record<string, { emoji: string; labelEn: string; labelVi: string; unitEn: string; unitVi: string }> = {
  projects: { emoji: '📁', labelEn: 'Extra Projects', labelVi: 'Dự án bổ sung', unitEn: '+5 projects', unitVi: '+5 dự án' },
  storage: { emoji: '💾', labelEn: 'Extra Storage', labelVi: 'Lưu trữ bổ sung', unitEn: '+5 GB storage', unitVi: '+5 GB lưu trữ' },
  members: { emoji: '👥', labelEn: 'Extra Members', labelVi: 'Thành viên bổ sung', unitEn: '+5 members', unitVi: '+5 thành viên' },
};

function getAddonDiscount(plan: string): { pct: number; label: string } {
  if (plan === 'plan_pro') return { pct: 0.10, label: '10%' };
  if (plan === 'plan_business') return { pct: 0.20, label: '20%' };
  return { pct: 0, label: '' };
}

export default function AddonCheckoutPayment() {
  const { orderCode } = useParams<{ orderCode: string }>();
  const navigate = useNavigate();
  const { translations: { app: { servicePlan: t } } } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const userAddons = useUserAddons();
  const accountLimits = useAccountLimitsCheck();

  const isVi = (profile as any)?.preferred_locale === 'vi' || document.documentElement.lang === 'vi';

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orderExpired, setOrderExpired] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [showBackDialog, setShowBackDialog] = useState(false);
  const [backDialogTimeLeft, setBackDialogTimeLeft] = useState('');
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(true);

  // Background polling: detect webhook-completed orders
  useEffect(() => {
    if (!user || !orderCode || paymentStatus === 'success') return;
    if (paymentStatus !== 'idle' && paymentStatus !== 'processing' && paymentStatus !== 'failed') return;

    const interval = setInterval(async () => {
      const { data } = await supabase.from('orders').select('status').eq('order_code', orderCode).eq('user_id', user.id).maybeSingle();
      if (data && data.status === 'completed') {
        clearInterval(interval);
        setPaymentStatus('success');
        userAddons.refresh();
        accountLimits.refresh();
        await refreshProfile();
        navigate(`/addon-checkout/summary/${orderCode}`, { replace: true });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [user, orderCode, paymentStatus, navigate, refreshProfile, userAddons, accountLimits]);

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
      // If order is finished, redirect to summary
      if (['completed', 'cancelled', 'expired'].includes(orderRes.data.status)) {
        navigate(`/addon-checkout/summary/${orderCode}`, { replace: true });
        return;
      }
      if (orderRes.data.status === 'failed') {
        setPaymentStatus('failed');
        setPaymentError(isVi ? 'Thanh toán trước đó thất bại. Vui lòng thử lại.' : 'Previous payment failed. Please try again.');
      }
      if (orderRes.data.expires_at && new Date(orderRes.data.expires_at).getTime() <= Date.now() && orderRes.data.status === 'pending') {
        setOrderExpired(true);
      }
      setLoading(false);
    });
  }, [user, orderCode, navigate]);

  const plan = profile?.user_plan || 'plan_free';
  const billingCycle = order?.billing_cycle || 'monthly';
  const discount = getAddonDiscount(plan);
  const addonBasePrice = billingCycle === 'yearly' ? BASE_PRICE * 10 : BASE_PRICE;
  const unitPrice = addonBasePrice * (1 - discount.pct);
  const cycleLabel = billingCycle === 'yearly' ? (isVi ? 'năm' : 'year') : (isVi ? 'tháng' : 'month');

  const addons: { type: string; quantity: number }[] = Array.isArray(order?.addons) ? order.addons : [];
  const totalQty = addons.reduce((s, a) => s + a.quantity, 0);
  const subtotal = totalQty * addonBasePrice;
  const saving = Math.round(totalQty * addonBasePrice * discount.pct * 100) / 100;
  const totalAmount = order?.total_amount || Math.round(totalQty * unitPrice * 100) / 100;

  const createSubscription = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('create-paypal-order', {
      body: {
        order_type: 'addon',
        billing_cycle: billingCycle,
        addons,
        internal_order_id: order?.id,
      },
    });
    if (error || !data?.subscriptionID) throw new Error(error?.message || 'Failed to create subscription');
    return data.subscriptionID;
  }, [billingCycle, addons, order]);

  const pollOrderStatus = useCallback(async (code: string, maxAttempts = 10, interval = 2000) => {
    for (let i = 0; i < maxAttempts; i++) {
      const { data } = await supabase.from('orders').select('status').eq('order_code', code).maybeSingle();
      if (data && data.status !== 'pending') return data.status;
      await new Promise(r => setTimeout(r, interval));
    }
    return null;
  }, []);

  const captureOrder = useCallback(async (subscriptionID: string) => {
    setPaymentStatus('processing');
    setPaymentError(null);
    try {
      const { data, error } = await supabase.functions.invoke('capture-paypal-order', {
        body: { subscriptionID },
      });
      if (error) throw new Error(error?.message || 'Capture failed');
      if (data?.success && !data?.pending) {
        setPaymentStatus('success');
        userAddons.refresh();
        accountLimits.refresh();
        await refreshProfile();
        toast({ title: '✅', description: isVi ? 'Mua add-on thành công!' : 'Add-on purchased successfully!' });
        navigate(`/addon-checkout/summary/${orderCode}`, { replace: true });
      } else if (data?.success && data?.pending) {
        toast({ title: isVi ? 'Đã xác nhận! Đang chờ kích hoạt...' : 'Confirmed! Waiting for activation...' });
        // Stay in processing, background polling will handle redirect
      } else {
        throw new Error('Capture failed');
      }
    } catch (err: any) {
      setPaymentStatus('failed');
      setPaymentError(err.message || (isVi ? 'Thanh toán thất bại. Vui lòng thử lại.' : 'Payment failed. Please try again.'));
      toast({ title: 'Error', description: err.message || 'Payment failed', variant: 'destructive' });
    }
  }, [navigate, isVi, userAddons, accountLimits, refreshProfile, orderCode]);

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

  // Compute remaining time for back dialog
  useEffect(() => {
    if (!showBackDialog || !order?.expires_at) return;
    const update = () => {
      const diff = new Date(order.expires_at).getTime() - Date.now();
      if (diff <= 0) { setBackDialogTimeLeft('00:00'); return; }
      const mm = Math.floor(diff / 60000);
      const ss = Math.floor((diff % 60000) / 1000);
      setBackDialogTimeLeft(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [showBackDialog, order?.expires_at]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-5">
      {/* Back button — hide when minimal layout already has one */}
      {sessionStorage.getItem('checkout_from') !== 'onboarding' && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
          onClick={() => setShowBackDialog(true)}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">{isVi ? 'Quay lại' : 'Back'}</span>
        </Button>
      )}
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

      {/* Order ID + Countdown */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{isVi ? 'Mã đơn hàng:' : 'Order ID:'}</span>
        <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{order?.order_code || orderCode}</code>
      </div>
      {order.expires_at && (
        <OrderCountdown
          expiresAt={order.expires_at}
          orderId={order.id}
          orderCode={order.order_code}
          isVi={isVi}
          onExpired={() => setOrderExpired(true)}
          onCreateNew={() => navigate('/addon-checkout')}
        />
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
                  toast({ title: isVi ? 'Đơn hàng đã được hủy' : 'Order has been cancelled' });
                  setShowCancelDialog(false);
                  navigate('/billing-history', { replace: true });
                } catch {
                  toast({ title: isVi ? 'Không thể hủy đơn hàng' : 'Failed to cancel order', variant: 'destructive' });
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

      {/* Back Confirmation Dialog */}
      <Dialog open={showBackDialog} onOpenChange={setShowBackDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isVi ? 'Rời khỏi trang thanh toán?' : 'Leave payment page?'}</DialogTitle>
            <DialogDescription>
              {isVi
                ? `Bạn còn đơn hàng chưa thanh toán. Có thể hoàn tất sau trong lịch sử. Còn lại: ${backDialogTimeLeft}.`
                : `You have an unpaid order. You can complete it later in history. Remaining: ${backDialogTimeLeft}.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBackDialog(false);
              navigate('/addon-checkout', { replace: true });
            }}>
              {isVi ? 'Quay lại' : 'Go back'}
            </Button>
            <Button onClick={() => setShowBackDialog(false)}>
              {isVi ? 'Tiếp tục thanh toán' : 'Continue payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Summary */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">{isVi ? 'Tóm tắt đơn hàng' : 'Order Summary'}</h3>
            <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{order?.order_code || orderCode}</code>
          </div>

          <div className="text-xs text-muted-foreground mb-3">
            {isVi ? 'Gói hiện tại' : 'Current plan'}: <span className="font-medium text-foreground">{formatPlanName(plan)}</span>
            {' · '}
            {isVi ? 'Chu kỳ' : 'Cycle'}: <span className="font-medium text-foreground capitalize">{billingCycle}</span>
          </div>

          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
            <div className="col-span-6">{isVi ? 'Sản phẩm' : 'Item'}</div>
            <div className="col-span-2 text-right">{isVi ? 'Đơn giá' : 'Price'}</div>
            <div className="col-span-2 text-center">{isVi ? 'SL' : 'Qty'}</div>
            <div className="col-span-2 text-right">{isVi ? 'Thành tiền' : 'Total'}</div>
          </div>

          {addons.map(addon => {
            const meta = ADDON_META[addon.type];
            const lineTotal = addon.quantity * addonBasePrice;
            return (
              <div key={addon.type} className="grid grid-cols-12 gap-2 items-center py-2.5 text-sm border-b border-dashed">
                <div className="col-span-6 flex items-center gap-2">
                  <span>{meta?.emoji || '📦'}</span>
                  <span>{isVi ? (meta?.unitVi || addon.type) : (meta?.unitEn || addon.type)}</span>
                </div>
                <div className="col-span-2 text-right text-muted-foreground">${addonBasePrice.toFixed(2)}</div>
                <div className="col-span-2 text-center text-muted-foreground">{addon.quantity}</div>
                <div className="col-span-2 text-right font-medium">${lineTotal.toFixed(2)}</div>
              </div>
            );
          })}

          <div className="pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{isVi ? 'Tạm tính' : 'Subtotal'}</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {saving > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>🎉 {isVi ? `Tiết kiệm add-on (${discount.label})` : `Add-on savings (${discount.label})`}</span>
                <span>-${saving.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>{isVi ? 'Tổng thanh toán' : 'Total'}</span>
              <div>
                <span className="tabular-nums">${totalAmount.toFixed(2)}</span>
                <span className="text-sm font-normal text-muted-foreground ml-1">/{cycleLabel}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment + Pay Box */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-5 pb-5 space-y-4">
              <h4 className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {isVi ? 'Phương thức thanh toán' : 'Payment Method'}
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
                    {paymentStatus === 'processing' ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <div className="space-y-1">
                          <p className="font-semibold">
                            {isVi ? 'Đang xác nhận thanh toán với PayPal' : 'Confirming payment with PayPal'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {isVi ? 'Hệ thống đang xác minh giao dịch của bạn...' : 'The system is verifying your transaction...'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>{isVi ? 'Vui lòng không thoát hoặc tải lại trang' : 'Please do not leave or reload this page'}</span>
                        </div>
                      </div>
                    ) : orderExpired ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <p className="text-sm text-destructive font-medium">
                          {isVi ? 'Đơn hàng đã hết hạn. Vui lòng tạo đơn mới.' : 'Order expired. Please create a new order.'}
                        </p>
                        <Button variant="outline" size="sm" onClick={() => navigate('/addon-checkout')}>
                          {isVi ? 'Tạo đơn mới' : 'Create new order'}
                        </Button>
                      </div>
                    ) : paypalClientId ? (
                      <div className={(showBackDialog || showCancelDialog) ? 'invisible' : ''}>
                        <PayPalScriptProvider options={{ clientId: paypalClientId, currency: 'USD', vault: true, intent: 'subscription' }}>
                          <PayPalButtons
                            style={{ layout: 'vertical', shape: 'rect', label: 'subscribe', height: 40 }}
                            createSubscription={async () => createSubscription()}
                            onApprove={async (data) => { await captureOrder(data.subscriptionID!); }}
                            onError={(err) => {
                              const errStr = String(err);
                              if (errStr.includes('popup close') || errStr.includes('Window is closed')) return;
                              console.error('PayPal error:', err);
                              toast({ title: 'PayPal Error', description: 'Payment could not be completed.', variant: 'destructive' });
                            }}
                            onCancel={() => {
                              toast({ title: isVi ? 'Đã hủy' : 'Cancelled', description: isVi ? 'Thanh toán đã bị hủy.' : 'Payment was cancelled.' });
                            }}
                          />
                        </PayPalScriptProvider>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
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
                  <span className="text-[10px] border rounded px-1.5 py-0.5 ml-auto text-muted-foreground">{isVi ? 'Sắp ra mắt' : 'Coming soon'}</span>
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
                  {billingCycle === 'yearly'
                    ? (isVi ? 'Thanh toán mỗi năm' : 'Billed once per year')
                    : (isVi ? 'Thanh toán mỗi tháng' : 'Billed once per month')}
                </p>
              </div>
              <Separator />
              {order.expires_at && !orderExpired && (
                <OrderCountdown
                  expiresAt={order.expires_at}
                  orderId={order.id}
                  orderCode={order.order_code}
                  isVi={isVi}
                  onExpired={() => setOrderExpired(true)}
                  onCreateNew={() => navigate('/addon-checkout')}
                />
              )}
              {orderExpired && (
                <div className="text-center text-sm text-destructive font-medium">
                  {isVi ? 'Đơn hàng đã hết hạn' : 'Order has expired'}
                </div>
              )}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                {isVi ? 'Thanh toán an toàn qua PayPal' : 'Secure payment powered by PayPal'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
