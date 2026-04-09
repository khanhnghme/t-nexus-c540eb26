import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PlanImpactPreview } from './PlanImpactPreview';
import { useAdminPlanActions, PlanActionType } from '@/hooks/useAdminPlanActions';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdminBillingRole } from '@/hooks/useAdminBillingRole';
import { AlertTriangle, ArrowUpCircle, ArrowDownCircle, CalendarPlus, ShieldOff, ShieldCheck, Gift } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentPlan: string;
  currentStatus: string;
  currentExpiresAt: string | null;
  onSuccess: () => void;
  defaultAction?: PlanActionType;
}

const PLANS = [
  { value: 'plan_free', label: 'Free' },
  { value: 'plan_plus', label: 'Plus' },
  { value: 'plan_pro', label: 'Pro' },
  { value: 'plan_business', label: 'Business' },
  { value: 'plan_custom', label: 'Custom' },
];

const EXTEND_OPTIONS = [
  { value: 7, label: '+7 days' },
  { value: 30, label: '+30 days' },
  { value: 90, label: '+90 days' },
  { value: 0, label: 'Custom' },
];

const ACTION_CONFIG: Record<PlanActionType, { icon: any; color: string; dangerous?: boolean }> = {
  upgrade: { icon: ArrowUpCircle, color: 'text-emerald-500' },
  downgrade: { icon: ArrowDownCircle, color: 'text-orange-500', dangerous: true },
  extend: { icon: CalendarPlus, color: 'text-blue-500' },
  suspend: { icon: ShieldOff, color: 'text-destructive', dangerous: true },
  restore: { icon: ShieldCheck, color: 'text-emerald-500' },
  grant_trial: { icon: Gift, color: 'text-violet-500' },
};

export function ManagePlanDialog({ open, onOpenChange, userId, currentPlan, currentStatus, currentExpiresAt, onSuccess, defaultAction }: Props) {
  const { translations } = useLanguage();
  const t = translations.app?.adminBilling?.managePlan;
  const rbac = translations.app?.adminBilling?.rbac;
  const { executePlanAction } = useAdminPlanActions();
  const { canOperate, canManage, billingRole } = useAdminBillingRole();
  const [action, setAction] = useState<PlanActionType>(defaultAction || 'upgrade');
  const [newPlan, setNewPlan] = useState(currentPlan === 'plan_free' ? 'plan_plus' : 'plan_free');
  const [effectiveMode, setEffectiveMode] = useState<'immediate' | 'next_cycle'>('immediate');
  const [extendPreset, setExtendPreset] = useState(30);
  const [customDays, setCustomDays] = useState('');
  const [reason, setReason] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [notifyUser, setNotifyUser] = useState(true);
  const [showImpact, setShowImpact] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const config = ACTION_CONFIG[action];
  const isDangerous = config.dangerous && (action === 'suspend' || (action === 'downgrade' && newPlan === 'plan_free'));
  const needsConfirm = isDangerous && confirmText !== 'CONFIRM';

  const extendDays = extendPreset === 0 ? parseInt(customDays) || 0 : extendPreset;

  const canSubmit = reason.trim().length > 0 
    && !loading 
    && (!isDangerous || confirmText === 'CONFIRM')
    && (action !== 'extend' || extendDays > 0);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await executePlanAction({
        userId,
        action,
        newPlan: ['upgrade', 'downgrade', 'grant_trial'].includes(action) ? newPlan : undefined,
        effectiveMode,
        extendDays: action === 'extend' ? extendDays : undefined,
        reason,
        internalNote: internalNote || undefined,
        notifyUser,
        currentPlan,
        currentExpiresAt,
      });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      console.error('Plan action error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setReason('');
    setInternalNote('');
    setConfirmText('');
    setShowImpact(false);
  };

  const ActionIcon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ActionIcon className={`h-5 w-5 ${config.color}`} />
            {t?.title || 'Manage Plan'}
          </DialogTitle>
          <DialogDescription>{t?.description || 'Change user plan, extend, suspend or restore access.'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Action Select */}
          <div className="space-y-1.5">
            <Label>{t?.actionLabel || 'Action'}</Label>
            {billingRole && (
              <div className="mb-2">
                <Badge variant="outline" className="text-xs">
                  {rbac?.roleLabel || 'Your billing role'}: {rbac?.[billingRole as keyof typeof rbac] || billingRole}
                </Badge>
              </div>
            )}
            <Select value={action} onValueChange={v => { setAction(v as PlanActionType); setShowImpact(false); setConfirmText(''); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="upgrade">{t?.actions?.upgrade || 'Upgrade'}</SelectItem>
                <SelectItem value="downgrade">{t?.actions?.downgrade || 'Downgrade'}</SelectItem>
                <SelectItem value="extend">{t?.actions?.extend || 'Extend'}</SelectItem>
                {canManage && <SelectItem value="suspend">{t?.actions?.suspend || 'Suspend'}</SelectItem>}
                {canManage && <SelectItem value="restore">{t?.actions?.restore || 'Restore'}</SelectItem>}
                <SelectItem value="grant_trial">{t?.actions?.grantTrial || 'Grant Trial'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Current plan badge */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t?.currentPlanLabel || 'Current:'}</span>
            <Badge variant="secondary">{PLANS.find(p => p.value === currentPlan)?.label || currentPlan}</Badge>
            <Badge variant="outline">{currentStatus}</Badge>
          </div>

          {/* Dynamic form fields */}
          {['upgrade', 'downgrade', 'grant_trial'].includes(action) && (
            <div className="space-y-1.5">
              <Label>{t?.newPlanLabel || 'New Plan'}</Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLANS.filter(p => p.value !== currentPlan).map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {['upgrade', 'downgrade'].includes(action) && (
            <div className="space-y-1.5">
              <Label>{t?.effectiveLabel || 'Effective'}</Label>
              <Select value={effectiveMode} onValueChange={v => setEffectiveMode(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">{t?.immediate || 'Immediately'}</SelectItem>
                  <SelectItem value="next_cycle">{t?.nextCycle || 'Next Billing Cycle'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {action === 'extend' && (
            <div className="space-y-1.5">
              <Label>{t?.extendLabel || 'Extend Duration'}</Label>
              <div className="flex flex-wrap gap-2">
                {EXTEND_OPTIONS.map(opt => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={extendPreset === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExtendPreset(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
              {extendPreset === 0 && (
                <Input
                  type="number"
                  placeholder={t?.customDays || 'Enter number of days'}
                  value={customDays}
                  onChange={e => setCustomDays(e.target.value)}
                  min={1}
                />
              )}
            </div>
          )}

          {/* Reason (required) */}
          <div className="space-y-1.5">
            <Label>{t?.reasonLabel || 'Reason'} <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder={t?.reasonPlaceholder || 'Enter the reason for this action...'}
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Internal Note (optional) */}
          <div className="space-y-1.5">
            <Label>{t?.noteLabel || 'Internal Note'} <span className="text-muted-foreground text-xs">({t?.optional || 'optional'})</span></Label>
            <Textarea
              placeholder={t?.notePlaceholder || 'Add an internal note...'}
              value={internalNote}
              onChange={e => setInternalNote(e.target.value)}
              rows={2}
            />
          </div>

          {/* Notify checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox id="notify" checked={notifyUser} onCheckedChange={c => setNotifyUser(!!c)} />
            <Label htmlFor="notify" className="text-sm cursor-pointer">{t?.notifyUser || 'Notify user about this change'}</Label>
          </div>

          {/* Preview Impact */}
          {['upgrade', 'downgrade', 'grant_trial'].includes(action) && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowImpact(!showImpact)}>
                {showImpact ? (t?.hideImpact || 'Hide Impact') : (t?.previewImpact || 'Preview Impact')}
              </Button>
              {showImpact && <PlanImpactPreview userId={userId} currentPlan={currentPlan} newPlan={newPlan} />}
            </>
          )}

          {/* Dangerous action confirmation */}
          {isDangerous && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                {t?.dangerWarning || 'This is a destructive action. Type CONFIRM to proceed.'}
              </div>
              <Input
                placeholder='Type "CONFIRM"'
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                className="border-destructive/30"
              />
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t?.cancel || 'Cancel'}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              variant={isDangerous ? 'destructive' : 'default'}
            >
              {loading ? (t?.processing || 'Processing...') : (t?.confirm || 'Confirm Action')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
