import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Ban, Loader2, ArrowRight, RotateCcw, Receipt, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getPlanLabel } from '@/lib/planConfig';

const STEP_LABELS_EN = ['Order', 'Payment', 'Summary'];
const STEP_LABELS_VI = ['Đặt hàng', 'Thanh toán', 'Kết quả'];

function StepProgress({ isVi }: { isVi: boolean }) {
  const labels = isVi ? STEP_LABELS_VI : STEP_LABELS_EN;
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-md mx-auto mb-6">
      {labels.map((label, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
              {i + 1}
            </div>
            <span className="text-xs mt-1 font-medium">{label}</span>
          </div>
          {i < labels.length - 1 && (
            <div className="h-0.5 w-full bg-primary -mt-4" />
          )}
        </div>
      ))}
    </div>
  );
}

const STATUS_CONFIG = {
  completed: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
    pingClass: 'bg-emerald-500/20',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-none',
  },
  failed: {
    icon: XCircle,
    iconClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
    pingClass: '',
    badgeClass: 'bg-destructive/15 text-destructive border-none',
  },
  cancelled: {
    icon: Ban,
    iconClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    pingClass: '',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-none',
  },
  expired: {
    icon: Clock,
    iconClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
    pingClass: '',
    badgeClass: 'bg-muted text-muted-foreground border-none',
  },
} as const;

type FinalStatus = keyof typeof STATUS_CONFIG;

export default function CheckoutSummary() {
  const { orderCode } = useParams<{ orderCode: string }>();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const isVi = (profile as any)?.preferred_locale === 'vi' || document.documentElement.lang === 'vi';

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !orderCode) return;
    supabase
      .from('orders')
      .select('*')
      .eq('order_code', orderCode)
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          navigate('/billing-history', { replace: true });
          return;
        }
        // If still pending, go back to payment step
        if (data.status === 'pending') {
          const route = data.order_type === 'addon' ? `/addon-checkout/${orderCode}` : `/checkout/payment/${orderCode}`;
          navigate(route, { replace: true });
          return;
        }
        setOrder(data);
        if (data.status === 'completed') refreshProfile();
        setLoading(false);
      });
  }, [user, orderCode, navigate, refreshProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) return null;

  const status: FinalStatus = order.status as FinalStatus;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.failed;
  const Icon = cfg.icon;

  const formatDT = (d: string | null) => {
    if (!d) return '—';
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };

  const titles: Record<FinalStatus, { en: string; vi: string }> = {
    completed: { en: 'Payment Successful!', vi: 'Thanh toán thành công!' },
    failed: { en: 'Payment Failed', vi: 'Thanh toán thất bại' },
    cancelled: { en: 'Order Cancelled', vi: 'Đơn hàng đã hủy' },
    expired: { en: 'Order Expired', vi: 'Đơn hàng đã hết hạn' },
  };

  const descs: Record<FinalStatus, { en: string; vi: string }> = {
    completed: { en: 'Your plan has been upgraded successfully.', vi: 'Gói của bạn đã được nâng cấp thành công.' },
    failed: { en: 'Something went wrong with your payment.', vi: 'Đã xảy ra lỗi với thanh toán của bạn.' },
    cancelled: { en: 'This order has been cancelled.', vi: 'Đơn hàng này đã bị hủy.' },
    expired: { en: 'This order has expired.', vi: 'Đơn hàng này đã hết hạn.' },
  };

  const title = titles[status] || titles.failed;
  const desc = descs[status] || descs.failed;

  // Determine end time label
  const endTime = order.completed_at || order.expires_at;

  return (
    <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
      <StepProgress isVi={isVi} />

      {/* Status Icon + Title */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="relative">
          {status === 'completed' && cfg.pingClass && (
            <div className={`absolute inset-0 rounded-full animate-ping ${cfg.pingClass}`} />
          )}
          <div className={`relative p-4 rounded-full ${cfg.bgClass}`}>
            <Icon className={`h-12 w-12 ${cfg.iconClass}`} />
          </div>
        </div>
        <h1 className="text-2xl font-bold">{isVi ? title.vi : title.en}</h1>
        <p className="text-muted-foreground text-sm">{isVi ? desc.vi : desc.en}</p>
      </div>

      {/* Order Details Card */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{isVi ? 'Chi tiết đơn hàng' : 'Order Details'}</h3>
            <span className="text-xs text-muted-foreground font-mono">{order.order_code || `#${order.id.slice(0, 8).toUpperCase()}`}</span>
          </div>
          <Separator />
          <div className="space-y-2 text-sm">
            {order.plan && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isVi ? 'Gói' : 'Plan'}</span>
                <span className="font-medium">{getPlanLabel(order.plan)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isVi ? 'Chu kỳ' : 'Billing Cycle'}</span>
              <span className="font-medium capitalize">{order.billing_cycle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isVi ? 'Giá gốc' : 'Base'}</span>
              <span>${(order.base_amount || 0).toFixed(2)}</span>
            </div>
            {(order.addon_amount || 0) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>{isVi ? 'Tiện ích bổ sung' : 'Add-ons'}</span>
                <span>+${order.addon_amount.toFixed(2)}</span>
              </div>
            )}
            {(order.discount_amount || 0) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>{isVi ? 'Giảm giá' : 'Discount'}{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
                <span>-${order.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>{isVi ? 'Tổng' : 'Total'}</span>
              <span>${(order.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isVi ? 'Thời gian tạo đơn' : 'Created at'}</span>
              <span className="text-xs">{formatDT(order.created_at)}</span>
            </div>
            {status === 'completed' && order.completed_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isVi ? 'Thanh toán lúc' : 'Paid at'}</span>
                <span className="text-xs">{formatDT(order.completed_at)}</span>
              </div>
            )}
            {status !== 'completed' && endTime && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {status === 'cancelled' ? (isVi ? 'Hủy lúc' : 'Cancelled at') :
                   status === 'expired' ? (isVi ? 'Hết hạn lúc' : 'Expired at') :
                   (isVi ? 'Kết thúc lúc' : 'Ended at')}
                </span>
                <span className="text-xs">{formatDT(endTime)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-center pt-1">
            <Badge variant="secondary" className={`text-xs ${cfg.badgeClass}`}>
              {status === 'completed' ? (isVi ? 'Hoàn tất' : 'Completed') :
               status === 'failed' ? (isVi ? 'Thất bại' : 'Failed') :
               status === 'cancelled' ? (isVi ? 'Đã hủy' : 'Cancelled') :
               (isVi ? 'Hết hạn' : 'Expired')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {status === 'completed' ? (
          <>
            <Button onClick={() => navigate('/service-plan')} className="w-full">
              {isVi ? 'Xem gói của bạn' : 'View Your Plan'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
              <Home className="w-4 h-4 mr-2" />
              {isVi ? 'Về Dashboard' : 'Back to Dashboard'}
            </Button>
          </>
        ) : status === 'failed' ? (
          <>
            <Button onClick={() => navigate(`/checkout/payment/${orderCode}`)} className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              {isVi ? 'Thanh toán lại' : 'Retry Payment'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/billing-history')} className="w-full">
              <Receipt className="w-4 h-4 mr-2" />
              {isVi ? 'Lịch sử thanh toán' : 'Billing History'}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => navigate('/checkout')} className="w-full">
              <ArrowRight className="w-4 h-4 mr-2" />
              {isVi ? 'Tạo đơn mới' : 'Create New Order'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/billing-history')} className="w-full">
              <Receipt className="w-4 h-4 mr-2" />
              {isVi ? 'Lịch sử thanh toán' : 'Billing History'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
