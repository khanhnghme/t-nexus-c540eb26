import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Shuffle } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
  { key: 'plan_plus', label: 'Plus' },
  { key: 'plan_pro', label: 'Pro' },
  { key: 'plan_business', label: 'Business' },
  { key: 'plan_custom', label: 'Custom' },
];

function generateCode() {
  return 'PROMO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

interface CouponFormDialogProps {
  open: boolean;
  onClose: () => void;
  coupon?: any;
}

export function CouponFormDialog({ open, onClose, coupon }: CouponFormDialogProps) {
  const { translations } = useLanguage();
  const t = translations.app?.adminBilling?.coupons;
  const queryClient = useQueryClient();

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [applicablePlans, setApplicablePlans] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (coupon) {
      setCode(coupon.code || '');
      setDiscountType(coupon.discount_type || 'percentage');
      setDiscountValue(String(coupon.discount_value || ''));
      setMaxUses(coupon.max_uses != null ? String(coupon.max_uses) : '');
      setApplicablePlans(coupon.applicable_plans || []);
      setStartsAt(coupon.starts_at ? coupon.starts_at.split('T')[0] : '');
      setExpiresAt(coupon.expires_at ? coupon.expires_at.split('T')[0] : '');
      setDescription(coupon.description || '');
      setIsActive(coupon.is_active ?? true);
    } else {
      setCode('');
      setDiscountType('percentage');
      setDiscountValue('');
      setMaxUses('');
      setApplicablePlans([]);
      setStartsAt('');
      setExpiresAt('');
      setDescription('');
      setIsActive(true);
    }
  }, [coupon, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const val = Number(discountValue);
      if (!val || val <= 0) throw new Error('Invalid discount value');
      if (discountType === 'percentage' && val > 100) throw new Error('Percentage cannot exceed 100');

      const payload: any = {
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: val,
        max_uses: maxUses ? Number(maxUses) : null,
        applicable_plans: applicablePlans,
        starts_at: startsAt || null,
        expires_at: expiresAt || null,
        description: description.trim() || null,
        is_active: isActive,
      };

      if (coupon) {
        const { error } = await supabase.from('coupons').update(payload).eq('id', coupon.id);
        if (error) throw error;
      } else {
        payload.created_by = user.id;
        const { error } = await supabase.from('coupons').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success(coupon ? (t?.updated || 'Coupon updated') : (t?.created || 'Coupon created'));
      onClose();
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save coupon'),
  });

  const togglePlan = (plan: string) => {
    setApplicablePlans(prev => prev.includes(plan) ? prev.filter(p => p !== plan) : [...prev, plan]);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{coupon ? (t?.editTitle || 'Edit Coupon') : (t?.createTitle || 'Create Coupon')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t?.codeLabel || 'Code'}</Label>
            <div className="flex gap-2">
              <Input value={code} onChange={e => setCode(e.target.value)} placeholder="PROMO-XXXX" className="font-mono" />
              <Button type="button" variant="outline" size="icon" onClick={() => setCode(generateCode())}>
                <Shuffle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t?.type || 'Type'}</Label>
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{t?.percentage || 'Percentage (%)'}</SelectItem>
                  <SelectItem value="fixed">{t?.fixedAmount || 'Fixed Amount ($)'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t?.value || 'Value'}</Label>
              <Input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder={discountType === 'percentage' ? '10' : '5.00'} />
            </div>
          </div>

          <div>
            <Label>{t?.maxUsesLabel || 'Max uses'} <span className="text-muted-foreground text-xs">({t?.optional || 'empty = unlimited'})</span></Label>
            <Input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="100" />
          </div>

          <div>
            <Label className="mb-2 block">{t?.applicablePlansLabel || 'Applicable plans'} <span className="text-muted-foreground text-xs">({t?.emptyAllPlans || 'empty = all plans'})</span></Label>
            <div className="flex flex-wrap gap-3">
              {PLANS.map(p => (
                <label key={p.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox checked={applicablePlans.includes(p.key)} onCheckedChange={() => togglePlan(p.key)} />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t?.validFrom || 'Valid from'}</Label>
              <Input type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
            </div>
            <div>
              <Label>{t?.validUntil || 'Valid until'}</Label>
              <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>{t?.descriptionLabel || 'Description'}</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder={t?.descriptionPlaceholder || 'e.g. Back-to-school promo 2026'} />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>{t?.activeToggle || 'Active'}</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>{t?.cancelBtn || 'Cancel'}</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? '...' : (coupon ? (t?.saveBtn || 'Save') : (t?.createBtn || 'Create'))}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
