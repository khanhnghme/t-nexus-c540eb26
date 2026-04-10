import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Ban, Loader2, ArrowRight, RotateCcw, Receipt, Home, Printer, CreditCard, Calendar, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getPlanLabel } from '@/lib/planConfig';

const STEP_LABELS_EN = ['Order', 'Payment', 'Summary'];
const STEP_LABELS_VI = ['Đặt hàng', 'Thanh toán', 'Kết quả'];

const STEP3_STATUS_STYLES: Record<string, { circle: string; text: string; line: string }> = {
  completed: { circle: 'bg-emerald-500 text-white', text: 'text-emerald-600 dark:text-emerald-400', line: 'bg-emerald-500' },
  failed: { circle: 'bg-destructive text-destructive-foreground', text: 'text-destructive', line: 'bg-destructive' },
  cancelled: { circle: 'bg-amber-500 text-white', text: 'text-amber-600 dark:text-amber-400', line: 'bg-amber-500' },
  expired: { circle: 'bg-muted-foreground text-white', text: 'text-muted-foreground', line: 'bg-muted-foreground' },
};

function StepProgress({ isVi, status }: { isVi: boolean; status?: string }) {
  const labels = isVi ? STEP_LABELS_VI : STEP_LABELS_EN;
  const s3 = STEP3_STATUS_STYLES[status || ''] || STEP3_STATUS_STYLES.completed;
  return (
    <div className="flex items-center justify-center w-full max-w-md mx-auto mb-6">
      {labels.map((label, i) => {
        const isLast = i === labels.length - 1;
        const circleClass = isLast ? s3.circle : 'bg-primary text-primary-foreground';
        const textClass = isLast ? s3.text : '';
        const lineClass = isLast ? '' : (i === labels.length - 2 ? s3.line : 'bg-primary');
        return (
          <div key={i} className="flex items-center" style={{ flex: isLast ? 'none' : 1 }}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${circleClass}`}>
                {i + 1}
              </div>
              <span className={`text-xs mt-1 font-medium whitespace-nowrap ${textClass}`}>{label}</span>
            </div>
            {!isLast && (
              <div className={`h-0.5 flex-1 mx-1 -mt-4 ${lineClass}`} />
            )}
          </div>
        );
      })}
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

const formatDate = (d: string | null) => {
  if (!d) return '—';
  const date = new Date(d);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};

const formatTime = (d: string | null) => {
  if (!d) return '';
  const date = new Date(d);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
};

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

  const statusLabel = status === 'completed' ? (isVi ? 'Hoàn tất' : 'Completed') :
    status === 'failed' ? (isVi ? 'Thất bại' : 'Failed') :
    status === 'cancelled' ? (isVi ? 'Đã hủy' : 'Cancelled') :
    (isVi ? 'Hết hạn' : 'Expired');

  // Parse addons
  const addons: Array<{ type: string; quantity: number }> = Array.isArray(order.addons) ? order.addons : [];
  const cycle = order.billing_cycle;

  // End time for non-completed
  const endTime = order.completed_at || order.expires_at;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <StepProgress isVi={isVi} />

      {/* Section 1: Status Header */}
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
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={`text-xs ${cfg.badgeClass}`}>
            {statusLabel}
          </Badge>
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {order.order_code}
          </span>
        </div>
      </div>

      {/* Section 2: Grid — Time Info + Payment Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Time Card */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {isVi ? 'Thông tin thời gian' : 'Timeline'}
            </div>
            <Separator />
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isVi ? 'Tạo đơn' : 'Created'}</span>
                <div className="text-right">
                  <div className="font-medium">{formatDate(order.created_at)}</div>
                  <div className="text-xs text-muted-foreground">{formatTime(order.created_at)}</div>
                </div>
              </div>
              {status === 'completed' && order.completed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isVi ? 'Thanh toán' : 'Paid'}</span>
                  <div className="text-right">
                    <div className="font-medium">{formatDate(order.completed_at)}</div>
                    <div className="text-xs text-muted-foreground">{formatTime(order.completed_at)}</div>
                  </div>
                </div>
              )}
              {status !== 'completed' && endTime && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {status === 'cancelled' ? (isVi ? 'Hủy lúc' : 'Cancelled') :
                     status === 'expired' ? (isVi ? 'Hết hạn' : 'Expired') :
                     (isVi ? 'Kết thúc' : 'Ended')}
                  </span>
                  <div className="text-right">
                    <div className="font-medium">{formatDate(endTime)}</div>
                    <div className="text-xs text-muted-foreground">{formatTime(endTime)}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Info Card */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              {isVi ? 'Thanh toán' : 'Payment'}
            </div>
            <Separator />
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isVi ? 'Phương thức' : 'Method'}</span>
                <span className="font-medium capitalize">{order.payment_method || 'PayPal'}</span>
              </div>
              {order.paypal_order_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded max-w-[140px] truncate" title={order.paypal_order_id}>
                    {order.paypal_order_id}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isVi ? 'Trạng thái' : 'Status'}</span>
                <Badge variant="secondary" className={`text-xs ${cfg.badgeClass}`}>
                  {statusLabel}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Cost Breakdown */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Hash className="w-4 h-4 text-muted-foreground" />
            {isVi ? 'Chi tiết đơn hàng' : 'Order Breakdown'}
          </div>
          <Separator />
          <div className="space-y-2 text-sm">
            {/* Plan row */}
            {order.plan && (
              <div className="flex justify-between items-center py-1">
                <div>
                  <span className="font-medium">{getPlanLabel(order.plan)} Plan</span>
                  <span className="text-xs text-muted-foreground ml-2 capitalize">
                    ({cycle === 'yearly' ? (isVi ? 'Theo năm' : 'Yearly') : (isVi ? 'Theo tháng' : 'Monthly')})
                  </span>
                </div>
                <span className="font-medium">${(order.base_amount || 0).toFixed(2)}</span>
              </div>
            )}

            {/* Addon rows */}
            {addons.map((addon, idx) => {
              const meta = ADDON_TYPES.find(a => a.type === addon.type);
              if (!meta || addon.quantity <= 0) return null;
              const unitPrice = cycle === 'yearly' ? ADDON_PRICE_MONTHLY * 10 : ADDON_PRICE_MONTHLY;
              const lineTotal = unitPrice * addon.quantity;
              return (
                <div key={idx} className="flex justify-between items-center py-1 text-muted-foreground">
                  <span>
                    {meta.emoji} {isVi ? meta.unitLabelVi : meta.unitLabel} ×{addon.quantity}
                  </span>
                  <span>+${lineTotal.toFixed(2)}</span>
                </div>
              );
            })}

            {/* Discount */}
            {(order.discount_amount || 0) > 0 && (
              <div className="flex justify-between items-center py-1 text-emerald-600">
                <span>
                  {isVi ? 'Giảm giá' : 'Discount'}
                  {order.coupon_code ? ` (${order.coupon_code})` : ''}
                </span>
                <span>-${order.discount_amount.toFixed(2)}</span>
              </div>
            )}

            {/* Welcome discount */}
            {(order.welcome_discount || 0) > 0 && (
              <div className="flex justify-between items-center py-1 text-emerald-600">
                <span>{isVi ? 'Ưu đãi chào mừng' : 'Welcome Discount'}</span>
                <span>-${order.welcome_discount.toFixed(2)}</span>
              </div>
            )}

            <Separator />

            {/* Total */}
            <div className="flex justify-between items-center pt-1">
              <span className="text-base font-bold">{isVi ? 'Tổng cộng' : 'Total'}</span>
              <span className="text-lg font-bold">${(order.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {status === 'completed' ? (
          <>
            <Button variant="outline" onClick={() => window.print()} className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              {isVi ? 'In hóa đơn' : 'Print Invoice'}
            </Button>
            <Button onClick={() => navigate('/dashboard')} className="flex-1">
              <Home className="w-4 h-4 mr-2" />
              {isVi ? 'Về Dashboard' : 'Go to Dashboard'}
            </Button>
          </>
        ) : status === 'failed' ? (
          <>
            <Button onClick={() => navigate(`/checkout/payment/${orderCode}`)} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              {isVi ? 'Thanh toán lại' : 'Retry Payment'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/billing-history')} className="flex-1">
              <Receipt className="w-4 h-4 mr-2" />
              {isVi ? 'Lịch sử thanh toán' : 'Billing History'}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => navigate('/checkout')} className="flex-1">
              <ArrowRight className="w-4 h-4 mr-2" />
              {isVi ? 'Tạo đơn mới' : 'Create New Order'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/billing-history')} className="flex-1">
              <Receipt className="w-4 h-4 mr-2" />
              {isVi ? 'Lịch sử thanh toán' : 'Billing History'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
