import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { ArrowLeft, Package, ShieldCheck, Loader2, FolderKanban, HardDrive, Users } from 'lucide-react';
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

const BASE_PRICE = 2.49;

function getAddonDiscount(plan: string): { pct: number; label: string } {
  if (plan === 'plan_pro') return { pct: 0.10, label: '10%' };
  if (plan === 'plan_business') return { pct: 0.20, label: '20%' };
  return { pct: 0, label: '' };
}

const ADDON_META: Record<string, { icon: React.ReactNode; labelEn: string; labelVi: string; unit: string; unitVi: string }> = {
  projects: { icon: <FolderKanban className="w-4 h-4 text-violet-500" />, labelEn: 'Extra Projects', labelVi: 'Dự án bổ sung', unit: '+5 projects', unitVi: '+5 dự án' },
  storage: { icon: <HardDrive className="w-4 h-4 text-orange-500" />, labelEn: 'Extra Storage', labelVi: 'Lưu trữ bổ sung', unit: '+5 GB', unitVi: '+5 GB' },
  members: { icon: <Users className="w-4 h-4 text-emerald-500" />, labelEn: 'Extra Members', labelVi: 'Thành viên bổ sung', unit: '+5 members', unitVi: '+5 thành viên' },
};

export default function AddonCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { translations: { app: { servicePlan: t } } } = useLanguage();
  const { user, profile } = useAuth();
  const userAddons = useUserAddons();
  const accountLimits = useAccountLimitsCheck();

  const isVi = (profile as any)?.preferred_locale === 'vi' || document.documentElement.lang === 'vi';

  // Parse addon deltas from URL
  const addonItems = useMemo(() => {
    const items: { type: string; quantity: number }[] = [];
    ['projects', 'storage', 'members'].forEach(type => {
      const qty = parseInt(searchParams.get(type) || '0', 10);
      if (qty > 0) items.push({ type, quantity: qty });
    });
    return items;
  }, [searchParams]);

  const plan = profile?.user_plan || 'plan_free';
  const billingCycle = (profile as any)?.billing_cycle || 'monthly';
  const discount = getAddonDiscount(plan);
  const addonBasePrice = billingCycle === 'yearly' ? BASE_PRICE * 10 : BASE_PRICE;
  const unitPrice = addonBasePrice * (1 - discount.pct);

  const totalQty = addonItems.reduce((s, a) => s + a.quantity, 0);
  const subtotal = totalQty * addonBasePrice;
  const saving = Math.round((subtotal - totalQty * unitPrice) * 100) / 100;
  const totalAmount = Math.round(totalQty * unitPrice * 100) / 100;

  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');

  useEffect(() => {
    supabase.functions.invoke('get-paypal-config').then(({ data }) => {
      if (data?.clientId) setPaypalClientId(data.clientId);
    });
  }, []);

  // Redirect if no items
  if (addonItems.length === 0) {
    navigate('/service-plan?tab=addon', { replace: true });
    return null;
  }

  const createOrder = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('create-paypal-order', {
      body: {
        order_type: 'addon',
        billing_cycle: billingCycle,
        addons: addonItems,
      },
    });
    if (error || !data?.orderID) throw new Error(error?.message || 'Failed to create order');
    return data.orderID;
  };

  const captureOrder = async (orderID: string) => {
    setPaymentStatus('processing');
    try {
      const { data, error } = await supabase.functions.invoke('capture-paypal-order', {
        body: { orderID },
      });
      if (error || !data?.success) throw new Error(error?.message || 'Capture failed');

      setPaymentStatus('success');
      userAddons.refresh();
      accountLimits.refresh();
      toast({ title: '✅', description: isVi ? 'Mua add-on thành công!' : 'Add-on purchased successfully!' });
      navigate(`/checkout/result?status=success&order_id=${data.orderId || ''}`, { replace: true });
    } catch (err: any) {
      setPaymentStatus('failed');
      toast({ title: 'Error', description: err.message || 'Payment failed', variant: 'destructive' });
    }
  };

  const cycleLabel = billingCycle === 'yearly' ? (isVi ? 'năm' : 'year') : (isVi ? 'tháng' : 'month');

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isVi ? 'Xác nhận & Thanh toán' : 'Confirm & Pay'}</h1>
          <p className="text-sm text-muted-foreground">
            {isVi ? 'Kiểm tra đơn hàng add-on trước khi thanh toán' : 'Review your add-on order before payment'}
          </p>
        </div>
      </div>

      {/* Order details */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            {isVi ? 'Chi tiết đơn hàng' : 'Order Details'}
          </h2>

          <div className="text-xs text-muted-foreground">
            {isVi ? 'Gói hiện tại' : 'Current plan'}: <span className="font-medium text-foreground">{formatPlanName(plan)}</span>
            {' · '}
            {isVi ? 'Chu kỳ' : 'Cycle'}: <span className="font-medium text-foreground capitalize">{billingCycle}</span>
          </div>

          <Separator />

          {/* Line items */}
          <div className="space-y-3">
            {addonItems.map(item => {
              const meta = ADDON_META[item.type];
              const originalLine = item.quantity * addonBasePrice;
              return (
                <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {meta?.icon}
                    <div>
                      <div className="text-sm font-medium">{isVi ? meta?.labelVi : meta?.labelEn}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.quantity} × {isVi ? meta?.unitVi : meta?.unit}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium tabular-nums">${originalLine.toFixed(2)}</div>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Subtotal */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{isVi ? 'Tạm tính' : 'Subtotal'}</span>
              <span className="tabular-nums">${subtotal.toFixed(2)}</span>
            </div>

            {saving > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>🎉 {isVi ? `Tiết kiệm add-on (${discount.label})` : `Add-on savings (${discount.label})`}</span>
                <span>-${saving.toFixed(2)}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between items-baseline">
            <span className="text-base font-bold">{isVi ? 'Tổng thanh toán' : 'Total'}</span>
            <div className="text-right">
              <span className="text-2xl font-bold tabular-nums">${totalAmount.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground ml-1">/{cycleLabel}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-base font-semibold">{isVi ? 'Phương thức thanh toán' : 'Payment Method'}</h2>

          {paymentStatus === 'processing' ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{isVi ? 'Đang xử lý...' : 'Processing...'}</p>
            </div>
          ) : paypalClientId ? (
            <PayPalScriptProvider options={{ clientId: paypalClientId, currency: 'USD' }}>
              <PayPalButtons
                style={{ layout: 'vertical', shape: 'rect', label: 'pay', height: 45 }}
                createOrder={async () => createOrder()}
                onApprove={async (data) => { await captureOrder(data.orderID); }}
                onError={(err) => {
                  console.error('PayPal error:', err);
                  toast({ title: 'PayPal Error', description: 'Payment could not be completed.', variant: 'destructive' });
                }}
                onCancel={() => {
                  toast({ title: isVi ? 'Đã hủy' : 'Cancelled', description: isVi ? 'Thanh toán đã bị hủy.' : 'Payment was cancelled.' });
                }}
              />
            </PayPalScriptProvider>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isVi ? 'Thanh toán an toàn qua PayPal' : 'Secure payment via PayPal'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
