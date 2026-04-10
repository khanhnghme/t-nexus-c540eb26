import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Loader2,
  FolderKanban, HardDrive, Users, Plus, Minus, Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserAddons, AddonType } from '@/hooks/useUserAddons';
import { supabase } from '@/integrations/supabase/client';
import { formatPlanName } from '@/hooks/useWorkspaceBilling';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

/* ═══ Constants ═══ */
const BASE_PRICE = 2.49;

function getAddonDiscount(plan: string): { pct: number; label: string } {
  if (plan === 'plan_pro') return { pct: 0.10, label: '10%' };
  if (plan === 'plan_business') return { pct: 0.20, label: '20%' };
  return { pct: 0, label: '' };
}

const ADDON_CARDS = [
  {
    type: 'projects' as AddonType,
    icon: <FolderKanban className="w-5 h-5" />,
    iconColor: 'text-violet-500',
    labelEn: 'Extra Projects',
    labelVi: 'Dự án bổ sung',
    descEn: '+5 projects per package',
    descVi: '+5 dự án mỗi gói',
    emoji: '📁',
    unitEn: '+5 projects',
    unitVi: '+5 dự án',
  },
  {
    type: 'storage' as AddonType,
    icon: <HardDrive className="w-5 h-5" />,
    iconColor: 'text-orange-500',
    labelEn: 'Extra Storage',
    labelVi: 'Lưu trữ bổ sung',
    descEn: '+5 GB per package',
    descVi: '+5 GB mỗi gói',
    emoji: '💾',
    unitEn: '+5 GB storage',
    unitVi: '+5 GB lưu trữ',
  },
  {
    type: 'members' as AddonType,
    icon: <Users className="w-5 h-5" />,
    iconColor: 'text-emerald-500',
    labelEn: 'Extra Members',
    labelVi: 'Thành viên bổ sung',
    descEn: '+5 member seats per package',
    descVi: '+5 thành viên mỗi gói',
    emoji: '👥',
    unitEn: '+5 members',
    unitVi: '+5 thành viên',
  },
];

/* ═══ Component ═══ */
export default function AddonCheckout() {
  const navigate = useNavigate();
  const { translations: { app: { servicePlan: t } } } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const userAddons = useUserAddons();

  const isVi = (profile as any)?.preferred_locale === 'vi' || document.documentElement.lang === 'vi';
  const plan = profile?.user_plan || 'plan_free';
  const billingCycle = (profile as any)?.billing_cycle || 'monthly';
  const discount = getAddonDiscount(plan);
  const addonBasePrice = billingCycle === 'yearly' ? BASE_PRICE * 10 : BASE_PRICE;
  const unitPrice = addonBasePrice * (1 - discount.pct);
  const cycleLabel = billingCycle === 'yearly' ? (isVi ? 'năm' : 'year') : (isVi ? 'tháng' : 'month');

  const [addons, setAddons] = useState<Record<AddonType, number>>({
    projects: 0,
    storage: 0,
    members: 0,
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [creatingReservation, setCreatingReservation] = useState(false);

  const updateAddon = (type: AddonType, delta: number) => {
    setAddons(prev => ({
      ...prev,
      [type]: Math.max(0, Math.min(10, (prev[type] || 0) + delta)),
    }));
  };

  const addonItems = useMemo(() =>
    (['projects', 'storage', 'members'] as AddonType[])
      .filter(type => addons[type] > 0)
      .map(type => ({ type, quantity: addons[type] })),
    [addons]
  );

  const totalQty = addons.projects + addons.storage + addons.members;
  const subtotal = totalQty * addonBasePrice;
  const saving = Math.round(totalQty * addonBasePrice * discount.pct * 100) / 100;
  const totalAmount = Math.round(totalQty * unitPrice * 100) / 100;
  const hasItems = totalQty > 0;

  // Create internal order reservation when entering Step 2
  const createReservation = useCallback(async () => {
    const items = (['projects', 'storage', 'members'] as AddonType[])
      .filter(type => addons[type] > 0)
      .map(type => ({ type, quantity: addons[type] }));

    const { data, error } = await supabase.from('orders').insert({
      user_id: user!.id,
      order_type: 'addon',
      billing_cycle: billingCycle,
      base_amount: subtotal,
      addon_amount: totalAmount,
      discount_amount: saving,
      welcome_discount: 0,
      total_amount: totalAmount,
      addons: items as any,
      addons_applied: false,
      payment_method: 'paypal',
      status: 'pending',
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    }).select('id, expires_at, order_code').single();

    if (error || !data) throw new Error(error?.message || 'Failed to create order');
    return data.order_code;
  }, [user, addons, billingCycle, subtotal, totalAmount, saving]);

  /* ═══ Order Summary Card (shared between steps) ═══ */
  const OrderSummaryCard = () => (
    <Card>
      <CardContent className="p-5 space-y-3">
        <h3 className="text-base font-semibold">{isVi ? 'Tóm tắt đơn hàng' : 'Order Summary'}</h3>

        <div className="text-xs text-muted-foreground">
          {isVi ? 'Gói hiện tại' : 'Current plan'}: <span className="font-medium text-foreground">{formatPlanName(plan)}</span>
          {' · '}
          {isVi ? 'Chu kỳ' : 'Cycle'}: <span className="font-medium text-foreground capitalize">{billingCycle}</span>
        </div>

        <Separator />

        {/* Line items */}
        {hasItems ? (
          <div className="space-y-2">
            {ADDON_CARDS.filter(c => addons[c.type] > 0).map(card => {
              const qty = addons[card.type];
              const lineTotal = qty * addonBasePrice;
              return (
                <div key={card.type} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{card.emoji}</span>
                    <div>
                      <span className="font-medium">{isVi ? card.labelVi : card.labelEn}</span>
                      <span className="text-muted-foreground ml-1">× {qty}</span>
                    </div>
                  </div>
                  <span className="tabular-nums">${lineTotal.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">
            {isVi ? 'Chưa chọn gói nào' : 'No packages selected'}
          </p>
        )}

        {hasItems && (
          <>
            <Separator />
            <div className="space-y-1.5">
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
            <div className="flex justify-between font-bold text-lg">
              <span>{isVi ? 'Tổng' : 'Total'}</span>
              <div className="text-right">
                <span className="tabular-nums">${totalAmount.toFixed(2)}</span>
                <span className="text-sm font-normal text-muted-foreground ml-1">/{cycleLabel}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  /* ═══════════════════════════════════════════════
     STEP 1: Select addons + summary
     ═══════════════════════════════════════════════ */
  if (step === 1) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/service-plan?tab=addon')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isVi ? 'Mua thêm gói bổ sung' : 'Purchase Add-ons'}</h1>
            <p className="text-sm text-muted-foreground">
              {isVi ? 'Bước 1/2 — Chọn số lượng gói' : 'Step 1/2 — Select packages'}
            </p>
          </div>
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* LEFT: Selection cards */}
          <div className="lg:col-span-3 space-y-3">
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-violet-500" />
                  {isVi ? 'Chọn gói bổ sung' : 'Select Add-on Packages'}
                </h3>

                <div className="space-y-3">
                  {ADDON_CARDS.map(card => {
                    const qty = addons[card.type];
                    const owned = userAddons.getQuantity(card.type);

                    return (
                      <div key={card.type} className="flex items-center justify-between gap-4 p-3 rounded-xl border bg-card">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-xl bg-muted ${card.iconColor}`}>
                            {card.icon}
                          </div>
                          <div>
                            <span className="font-semibold text-sm">{isVi ? card.labelVi : card.labelEn}</span>
                            <p className="text-xs text-muted-foreground">{isVi ? card.descVi : card.descEn}</p>
                            {owned > 0 && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {isVi ? `Đã sở hữu: ${owned} gói` : `Owned: ${owned} pkg`}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => updateAddon(card.type, -1)}
                            disabled={qty <= 0}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </Button>
                          <div className="text-center min-w-[3rem]">
                            <div className="text-lg font-bold tabular-nums">{qty}</div>
                            <div className="text-[10px] text-muted-foreground">{isVi ? 'gói' : 'pkg'}</div>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => updateAddon(card.type, 1)}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Order Summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-6">
              <OrderSummaryCard />
            </div>
          </div>
        </div>

        {/* Bottom CTA bar */}
        <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-t">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{isVi ? 'Tổng' : 'Total'}</p>
              <p className="text-2xl font-bold tabular-nums">${totalAmount.toFixed(2)}</p>
            </div>
            <Button
              size="lg"
              className="gap-2 px-10 text-base"
              onClick={() => { setShowConfirmDialog(true); setAgreedToPolicy(false); }}
              disabled={!hasItems}
            >
              {isVi ? 'Tiếp tục' : 'Continue to Pay'}
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
                id="addon-policy-agree"
                checked={agreedToPolicy}
                onCheckedChange={(v) => setAgreedToPolicy(v === true)}
                className="mt-0.5"
              />
              <label htmlFor="addon-policy-agree" className="text-sm leading-relaxed cursor-pointer">
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
                  const newOrderCode = await createReservation();
                  setShowConfirmDialog(false);
                  navigate('/addon-checkout/' + newOrderCode);
                } catch (e) {
                  toast({ title: 'Error', description: isVi ? 'Không thể tạo đơn hàng' : 'Failed to create order', variant: 'destructive' });
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

  /* Step 2 is now a separate route: /addon-checkout/:orderId */
  return null;
}
