import { useEffect, useState, useRef } from 'react';
import tNexusText from '@/assets/t-nexus-text.png';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Ban, Loader2, ArrowRight, RotateCcw, Receipt, Printer, CreditCard, Calendar, Hash, ShieldAlert, LogIn } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PLAN_CONFIG, getPlanLabel, type PlanKey } from '@/lib/planConfig';

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

const ADDON_TYPES = [
  { type: 'projects', emoji: '📁', unitLabel: '+5 projects', unitLabelVi: '+5 dự án' },
  { type: 'storage', emoji: '💾', unitLabel: '+5 GB storage', unitLabelVi: '+5 GB lưu trữ' },
  { type: 'members', emoji: '👥', unitLabel: '+10 members', unitLabelVi: '+10 thành viên' },
];

const ADDON_PRICE_MONTHLY = 2.49;

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

function getOrderPricingBreakdown(order: any) {
  const addons: Array<{ type: string; quantity: number }> = Array.isArray(order?.addons) ? order.addons : [];
  const cycle = order?.billing_cycle === 'yearly' ? 'yearly' : 'monthly';
  const isAddonOrder = order?.order_type === 'addon';
  const welcomeDiscount = roundCurrency(Number(order?.welcome_discount) || 0);

  const addonOriginal = roundCurrency(
    addons.reduce((sum, addon) => {
      const quantity = Number(addon?.quantity) || 0;
      if (quantity <= 0) return sum;
      const unitPrice = cycle === 'yearly' ? ADDON_PRICE_MONTHLY * 10 : ADDON_PRICE_MONTHLY;
      return sum + unitPrice * quantity;
    }, 0),
  );

  const planCatalogPrice = order?.plan
    ? (cycle === 'yearly'
        ? PLAN_CONFIG[order.plan as PlanKey]?.yearlyPrice
        : PLAN_CONFIG[order.plan as PlanKey]?.monthlyPrice)
    : null;

  const fallbackPlanAmount = roundCurrency((Number(order?.base_amount) || 0) + welcomeDiscount);
  const planAmount = roundCurrency(
    isAddonOrder
      ? 0
      : typeof planCatalogPrice === 'number'
        ? planCatalogPrice
        : fallbackPlanAmount,
  );

  const subtotal = roundCurrency(planAmount + addonOriginal);
  const totalAmount = roundCurrency(Number(order?.total_amount) || 0);
  const couponDiscount = roundCurrency(isAddonOrder ? 0 : Math.max(0, Number(order?.discount_amount) || 0));
  const addonFinal = roundCurrency(Number(order?.addon_amount) || 0);
  const addonSavings = roundCurrency(Math.max(0, addonOriginal - addonFinal));
  const addonSavingsRate = addonOriginal > 0 && addonSavings > 0 ? Math.round((addonSavings / addonOriginal) * 100) : 0;

  return {
    planAmount,
    subtotal,
    totalAmount,
    welcomeDiscount,
    couponDiscount,
    addonSavings,
    addonSavingsRate,
  };
}

const formatDateInvoice = (d: string | null) => {
  if (!d) return '—';
  const date = new Date(d);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

function PrintableInvoice({ order, profile, isVi }: { order: any; profile: any; isVi: boolean }) {
  const invoiceQrUrl = order.order_code ? `https://t-nexus.io.vn/checkout/summary/${order.order_code}` : null;
  const addons: Array<{ type: string; quantity: number }> = Array.isArray(order.addons) ? order.addons : [];
  const cycle = order.billing_cycle;
  const isCompleted = order.status === 'completed';
  const pricing = getOrderPricingBreakdown(order);

  const planStarted = profile?.plan_started_at;
  const planExpires = profile?.plan_expires_at;
  const invoiceNumber = order.order_code ? `INV-${order.order_code}` : `INV-${order.id?.slice(0, 8)?.toUpperCase()}`;
  const paidDate = order.completed_at || order.created_at;

  return (
    <div className="hidden print:block bg-white text-black p-6 max-w-[800px] mx-auto text-[13px]" id="invoice-print-area" style={{ pageBreakInside: 'avoid' }}>
      {/* Header with Logo */}
      <div className="flex justify-between items-start mb-5 border-b-2 border-gray-300 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isVi ? 'HÓA ĐƠN' : 'INVOICE'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isVi ? 'Biên nhận thanh toán điện tử' : 'Electronic Payment Receipt'}
          </p>
          <p className="text-xs font-mono font-semibold text-gray-700 mt-1">{invoiceNumber}</p>
        </div>
        <div className="text-right -mt-1">
          <img src={tNexusText} alt="T-Nexus" style={{ width: 100, height: 'auto' }} className="ml-auto mb-1" />
          <p className="text-[10px] text-gray-400 mt-0.5">
            {isVi ? 'Dịch vụ quản lý dự án số' : 'Digital Project Management Service'}
          </p>
        </div>
      </div>

      {/* Invoice Info + Customer */}
      <div className="grid grid-cols-2 gap-6 mb-5 items-start">
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            {isVi ? 'Thông tin hóa đơn' : 'Invoice Details'}
          </h3>
          <div className="space-y-1 text-[12px]">
            
            <p><span className="text-gray-500">{isVi ? 'Mã đơn hàng:' : 'Order #:'}</span> <span className="font-mono font-medium">{order.order_code}</span></p>
            {order.paypal_order_id && (
              <p><span className="text-gray-500">Transaction ID:</span> <span className="font-mono text-[10px]">{order.paypal_order_id}</span></p>
            )}
            <p><span className="text-gray-500">{isVi ? 'Ngày tạo:' : 'Created:'}</span> {formatDateInvoice(order.created_at)}</p>
            {isCompleted && order.completed_at && (
              <p><span className="text-gray-500">{isVi ? 'Ngày thanh toán:' : 'Paid on:'}</span> {formatDateInvoice(order.completed_at)}</p>
            )}
            <p><span className="text-gray-500">{isVi ? 'Phương thức:' : 'Method:'}</span> <span className="capitalize">{order.payment_method || 'PayPal'}</span></p>
            <p>
              <span className="text-gray-500">{isVi ? 'Trạng thái:' : 'Status:'}</span>{' '}
              <span className={`font-semibold ${isCompleted ? 'text-green-700' : 'text-red-600'}`}>
                {isCompleted ? (isVi ? '✓ Đã thanh toán' : '✓ Paid') : (isVi ? '✗ Thất bại' : '✗ Failed')}
              </span>
            </p>
          </div>
        </div>
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            {isVi ? 'Thông tin khách hàng' : 'Bill To'}
          </h3>
          <div className="space-y-1 text-[12px]">
            <p className="font-semibold text-gray-900">{profile?.full_name || '—'}</p>
            <p className="text-gray-600">{profile?.email || '—'}</p>
            {profile?.student_id && <p className="text-gray-600">{isVi ? 'MSSV:' : 'Student ID:'} {profile.student_id}</p>}
            {profile?.institution && <p className="text-gray-600">{isVi ? 'Trường:' : 'Institution:'} {profile.institution}</p>}
            {profile?.phone && <p className="text-gray-600">{isVi ? 'SĐT:' : 'Phone:'} {profile.phone}</p>}
          </div>
        </div>
      </div>

      {/* Billing Period */}
      {isCompleted && order.plan && (planStarted || planExpires) && (
        <div className="mb-4 bg-gray-50 border border-gray-200 rounded p-2.5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            {isVi ? 'Chu kỳ thanh toán' : 'Billing Period'}
          </h3>
          <div className="flex gap-6 text-[12px]">
            {planStarted && (
              <p><span className="text-gray-500">{isVi ? 'Kích hoạt:' : 'Active:'}</span> <span className="font-medium">{formatDateInvoice(planStarted)}</span></p>
            )}
            {planExpires && (
              <p><span className="text-gray-500">{isVi ? 'Hết hạn:' : 'Expires:'}</span> <span className="font-medium">{formatDateInvoice(planExpires)}</span></p>
            )}
            <p>
              <span className="text-gray-500">{isVi ? 'Chu kỳ:' : 'Cycle:'}</span>{' '}
              <span className="font-medium">
                {cycle === 'yearly' ? (isVi ? '12 tháng' : '12 months') : (isVi ? '1 tháng' : '1 month')}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Line Items Table */}
      <table className="w-full mb-4 text-[12px] border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="text-left py-2 font-semibold text-gray-700">#</th>
            <th className="text-left py-2 font-semibold text-gray-700">{isVi ? 'Mô tả' : 'Description'}</th>
            <th className="text-right py-2 font-semibold text-gray-700">{isVi ? 'Đơn giá' : 'Unit Price'}</th>
            <th className="text-center py-2 font-semibold text-gray-700">{isVi ? 'SL' : 'Qty'}</th>
            <th className="text-right py-2 font-semibold text-gray-700">{isVi ? 'Thành tiền' : 'Amount'}</th>
          </tr>
        </thead>
        <tbody>
          {order.plan && (
            <tr className="border-b border-gray-100">
              <td className="py-3 text-gray-500">1</td>
              <td className="py-3">
                <p className="font-medium">{getPlanLabel(order.plan)} Plan</p>
                <p className="text-xs text-gray-500">
                  {cycle === 'yearly' ? (isVi ? 'Gói năm (12 tháng)' : 'Annual subscription (12 months)') : (isVi ? 'Gói tháng (1 tháng)' : 'Monthly subscription (1 month)')}
                </p>
              </td>
              <td className="py-3 text-right tabular-nums">${(order.base_amount || 0).toFixed(2)}</td>
              <td className="py-3 text-center">1</td>
              <td className="py-3 text-right tabular-nums font-medium">${pricing.planAmount.toFixed(2)}</td>
            </tr>
          )}

          {addons.map((addon, idx) => {
            const meta = ADDON_TYPES.find(a => a.type === addon.type);
            if (!meta || addon.quantity <= 0) return null;
            const unitPrice = cycle === 'yearly' ? ADDON_PRICE_MONTHLY * 10 : ADDON_PRICE_MONTHLY;
            const lineTotal = unitPrice * addon.quantity;
            return (
              <tr key={idx} className="border-b border-gray-100">
                <td className="py-3 text-gray-500">{(order.plan ? 2 : 1) + idx}</td>
                <td className="py-3">
                  <p className="font-medium">{meta.emoji} {isVi ? meta.unitLabelVi : meta.unitLabel}</p>
                  <p className="text-xs text-gray-500">{isVi ? 'Gói bổ sung' : 'Add-on package'}</p>
                </td>
                <td className="py-3 text-right tabular-nums">${unitPrice.toFixed(2)}</td>
                <td className="py-3 text-center">{addon.quantity}</td>
                <td className="py-3 text-right tabular-nums font-medium">${lineTotal.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>

        <tfoot>
          <tr className="border-t border-gray-200">
            <td colSpan={4} className="py-2 text-right text-gray-500">{isVi ? 'Tạm tính' : 'Subtotal'}</td>
            <td className="py-2 text-right tabular-nums">${pricing.subtotal.toFixed(2)}</td>
          </tr>

          {pricing.welcomeDiscount > 0 && (
            <tr className="text-green-700">
              <td colSpan={4} className="py-1 text-right">{isVi ? 'Ưu đãi chào mừng' : 'Welcome Discount'}</td>
              <td className="py-1 text-right tabular-nums">-${pricing.welcomeDiscount.toFixed(2)}</td>
            </tr>
          )}

          {pricing.addonSavings > 0 && (
            <tr className="text-green-700">
              <td colSpan={4} className="py-1 text-right">
                {isVi
                  ? `Tiết kiệm add-on${pricing.addonSavingsRate > 0 ? ` (${pricing.addonSavingsRate}%)` : ''}`
                  : `Add-on savings${pricing.addonSavingsRate > 0 ? ` (${pricing.addonSavingsRate}%)` : ''}`}
              </td>
              <td className="py-1 text-right tabular-nums">-${pricing.addonSavings.toFixed(2)}</td>
            </tr>
          )}

          {pricing.couponDiscount > 0 && (
            <tr className="text-green-700">
              <td colSpan={4} className="py-1 text-right">
                {isVi ? 'Mã giảm giá' : 'Coupon Discount'}
                {order.coupon_code ? ` (${order.coupon_code})` : ''}
              </td>
              <td className="py-1 text-right tabular-nums">-${pricing.couponDiscount.toFixed(2)}</td>
            </tr>
          )}

          <tr>
            <td colSpan={4} className="py-1 text-right text-gray-500">{isVi ? 'Thuế VAT (0%)' : 'Tax / VAT (0%)'}</td>
            <td className="py-1 text-right tabular-nums text-gray-500">$0.00</td>
          </tr>
          <tr className="border-t-2 border-gray-400">
            <td colSpan={4} className="py-3 text-right font-bold text-base">{isVi ? 'TỔNG CỘNG' : 'TOTAL'}</td>
            <td className="py-3 text-right font-bold text-lg tabular-nums">${(order.total_amount || 0).toFixed(2)} USD</td>
          </tr>
        </tfoot>
      </table>

      {/* Payment Notes */}
      <div className="mb-3 text-[11px] text-gray-500 space-y-0.5">
        <p className="font-semibold text-gray-600 text-xs mb-0.5">{isVi ? 'Ghi chú' : 'Notes'}</p>
        <p>{isVi ? '• Thanh toán được xử lý qua cổng PayPal quốc tế.' : '• Payment processed via international PayPal gateway.'}</p>
        <p>{isVi ? '• Gói dịch vụ sẽ tự động kích hoạt sau khi thanh toán thành công.' : '• Service plan activates automatically upon successful payment.'}</p>
        <p>{isVi ? '• Mọi thắc mắc vui lòng liên hệ support@t-nexus.io.vn.' : '• For inquiries, please contact support@t-nexus.io.vn.'}</p>
      </div>

      {/* Electronic Signature & Stamp — compact */}
      <div className="flex justify-between items-end mt-4 pt-3 border-t border-gray-200" style={{ pageBreakInside: 'avoid' }}>
        {/* QR code — left side */}
        {invoiceQrUrl && (
          <div className="flex flex-col items-center">
            <QRCodeSVG value={invoiceQrUrl} size={60} level="M" />
            <p className="text-[8px] text-gray-400 mt-0.5">
              {isVi ? 'Quét để xem' : 'Scan to view'}
            </p>
          </div>
        )}

        <div className="text-center" style={{ width: 160 }}>
          <p className="text-[10px] text-gray-400 mb-3">
            {isVi ? 'Chữ ký điện tử' : 'Electronic Signature'}
          </p>
          {isCompleted && (
            <p className="text-[11px] font-bold text-green-600 mb-1">
              {isVi ? '✓ ĐÃ THANH TOÁN' : '✓ PAID'}
            </p>
          )}
          <div className="border-b border-gray-400 w-full mb-1" />
          <p className="font-bold text-gray-800 text-xs">T-Nexus System</p>
          <p className="text-[9px] text-gray-400">
            {paidDate ? formatDateInvoice(paidDate) : new Date().toLocaleDateString(isVi ? 'vi-VN' : 'en-US')}
          </p>
        </div>
      </div>

      {/* Footer — compact */}
      <div className="border-t border-gray-200 pt-2 mt-3 space-y-0.5 text-center">
        <p className="text-[10px] text-gray-500">
          {isVi
            ? 'Đây là hóa đơn điện tử được tạo tự động bởi hệ thống T-Nexus.'
            : 'This is a computer-generated electronic invoice by T-Nexus.'}
        </p>
        <p className="text-[10px] text-gray-400">
          {isVi ? 'Hỗ trợ:' : 'Support:'} support@t-nexus.io.vn | https://t-nexus.io.vn
        </p>
      </div>
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
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuth();
  const isVi = (profile as any)?.preferred_locale === 'vi' || document.documentElement.lang === 'vi';

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // If not logged in after auth finishes loading, save URL and show login prompt
  const needsLogin = !authLoading && !user;

  useEffect(() => {
    if (needsLogin && orderCode) {
      sessionStorage.setItem('t-nexus_post_login_redirect', window.location.pathname);
    }
  }, [needsLogin, orderCode]);

  useEffect(() => {
    if (!user || !orderCode || authLoading) return;
    (async () => {
      // Fetch order by order_code only (no user_id filter)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_code', orderCode)
        .single();

      if (error || !data) {
        navigate('/billing-history', { replace: true });
        return;
      }

      // Access control: owner or system:owner/system:admin
      if (data.user_id !== user.id) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        const userRoles = (roles || []).map((r: any) => r.role);
        if (!userRoles.includes('system:owner') && !userRoles.includes('system:admin')) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
      }

      if (data.status === 'pending') {
        let resolved = false;
        for (let i = 0; i < 8; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const { data: fresh } = await supabase
            .from('orders')
            .select('*')
            .eq('order_code', orderCode)
            .maybeSingle();
          if (fresh && fresh.status !== 'pending') {
            setOrder(fresh);
            if (fresh.status === 'completed') refreshProfile();
            setLoading(false);
            resolved = true;
            break;
          }
        }
        if (!resolved) {
          const route = data.order_type === 'addon' ? `/addon-checkout/payment/${orderCode}` : `/checkout/payment/${orderCode}`;
          navigate(route, { replace: true });
        }
        return;
      }
      setOrder(data);
      if (data.status === 'completed') refreshProfile();
      setLoading(false);
    })();
  }, [user, orderCode, navigate, refreshProfile, authLoading]);

  // --- Login prompt (not logged in) ---
  if (needsLogin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <LogIn className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">
              {isVi ? 'Đăng nhập để xem hóa đơn' : 'Sign in to view invoice'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isVi
                ? 'Bạn cần đăng nhập bằng tài khoản đã mua đơn hàng này.'
                : 'Please sign in with the account that made this purchase.'}
            </p>
            <Button asChild className="w-full">
              <Link to="/login">{isVi ? 'Đăng nhập' : 'Sign in'}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Access denied (wrong user, not admin) ---
  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">
              {isVi ? 'Truy cập bị từ chối' : 'Access Denied'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isVi
                ? 'Bạn không có quyền xem hóa đơn này. Chỉ chủ đơn hàng hoặc quản trị viên mới được phép truy cập.'
                : 'You do not have permission to view this invoice. Only the order owner or system administrators can access it.'}
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard">{isVi ? 'Về trang chủ' : 'Go to Dashboard'}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authLoading || loading) {
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
  const pricing = getOrderPricingBreakdown(order);

  // End time for non-completed
  const endTime = order.completed_at || order.expires_at;

  return (
    <>
    {/* Print styles */}
    <style>{`
      @media print {
        body * { visibility: hidden !important; }
        #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
        #invoice-print-area { 
          position: absolute; left: 0; top: 0; width: 100%;
          display: block !important;
        }
        .print\\:block { display: block !important; }
        .print\\:hidden { display: none !important; }
      }
    `}</style>

    {/* Printable invoice (hidden on screen, shown on print) */}
    <PrintableInvoice order={order} profile={profile} isVi={isVi} />

    {/* Screen content */}
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6 print:hidden">
      <StepProgress isVi={isVi} status={status} />

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
                <span className="font-medium">${pricing.planAmount.toFixed(2)}</span>
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

            <div className="flex justify-between items-center py-1 text-sm">
              <span className="text-muted-foreground">{isVi ? 'Tạm tính' : 'Subtotal'}</span>
              <span>${pricing.subtotal.toFixed(2)}</span>
            </div>

            {pricing.welcomeDiscount > 0 && (
              <div className="flex justify-between items-center py-1 text-emerald-600">
                <span>{isVi ? 'Ưu đãi chào mừng' : 'Welcome Discount'}</span>
                <span>-${pricing.welcomeDiscount.toFixed(2)}</span>
              </div>
            )}

            {pricing.addonSavings > 0 && (
              <div className="flex justify-between items-center py-1 text-emerald-600">
                <span>
                  {isVi
                    ? `Tiết kiệm add-on${pricing.addonSavingsRate > 0 ? ` (${pricing.addonSavingsRate}%)` : ''}`
                    : `Add-on savings${pricing.addonSavingsRate > 0 ? ` (${pricing.addonSavingsRate}%)` : ''}`}
                </span>
                <span>-${pricing.addonSavings.toFixed(2)}</span>
              </div>
            )}

            {pricing.couponDiscount > 0 && (
              <div className="flex justify-between items-center py-1 text-emerald-600">
                <span>
                  {isVi ? 'Mã giảm giá' : 'Coupon Discount'}
                  {order.coupon_code ? ` (${order.coupon_code})` : ''}
                </span>
                <span>-${pricing.couponDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-1 text-sm text-muted-foreground">
              <span>{isVi ? 'Thuế VAT (0%)' : 'Tax / VAT (0%)'}</span>
              <span>$0.00</span>
            </div>

            <Separator />

            {/* Total */}
            <div className="flex justify-between items-center pt-1">
              <span className="text-base font-bold">{isVi ? 'Tổng cộng' : 'Total'}</span>
              <span className="text-lg font-bold">${pricing.totalAmount.toFixed(2)}</span>
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
            {sessionStorage.getItem('checkout_from') === 'onboarding' ? (
              <Button onClick={() => { sessionStorage.removeItem('checkout_from'); navigate('/onboarding'); }} className="flex-1">
                <ArrowRight className="w-4 h-4 mr-2" />
                {isVi ? 'Tiếp tục thiết lập' : 'Continue Setup'}
              </Button>
            ) : sessionStorage.getItem('checkout_from') === 'billing' ? (
              <Button onClick={() => { sessionStorage.removeItem('checkout_from'); navigate('/billing-history'); }} className="flex-1">
                <Receipt className="w-4 h-4 mr-2" />
                {isVi ? 'Lịch sử thanh toán' : 'Billing History'}
              </Button>
            ) : order.order_type === 'addon' ? (
              <Button onClick={() => navigate('/service-plan?tab=addon')} className="flex-1">
                <ArrowRight className="w-4 h-4 mr-2" />
                {isVi ? 'Xem gói bổ sung' : 'View Add-ons'}
              </Button>
            ) : (
              <Button onClick={() => navigate('/service-plan')} className="flex-1">
                <ArrowRight className="w-4 h-4 mr-2" />
                {isVi ? 'Xem gói dịch vụ' : 'View Service Plan'}
              </Button>
            )}
          </>
        ) : status === 'failed' ? (
          <>
            <Button onClick={() => navigate(order.order_type === 'addon' ? `/addon-checkout/payment/${orderCode}` : `/checkout/payment/${orderCode}`)} className="flex-1">
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
            <Button onClick={() => navigate(order.order_type === 'addon' ? '/addon-checkout' : '/checkout')} className="flex-1">
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
    </>
  );
}
