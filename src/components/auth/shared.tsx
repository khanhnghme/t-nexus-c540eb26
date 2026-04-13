import { z } from 'zod';
import { Checkbox } from '@/components/ui/checkbox';
import { Wrench, ShieldAlert, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, type Locale } from 'date-fns';

export const loginSchema = (ta: Record<string, string>) => z.object({
  identifier: z.string().min(1, ta.valIdentifierRequired).email(ta.valEmailFormat || 'Email không hợp lệ'),
  password: z.string().min(6, ta.valPasswordMin),
});

export const registerSchema = (ta: Record<string, string>) => z.object({
  studentId: z.string().max(20, ta.valStudentIdMax).optional().or(z.literal('')),
  fullName: z.string().min(1, ta.valFullNameRequired).max(100, ta.valFullNameMax),
  institution: z.string().min(1, ta.valInstitutionRequired),
  email: z.string().email(ta.valEmailInvalid).max(255, ta.valEmailMax),
  password: z.string().min(6, ta.valPasswordMin),
  confirmPassword: z.string().min(6, ta.valConfirmPasswordMin),
}).refine(data => data.password === data.confirmPassword, {
  message: ta.valPasswordMismatch,
  path: ['confirmPassword'],
});

export function PolicyCheckbox({
  checked,
  onCheckedChange,
  error,
  ta,
  localizedPolicyPath,
  localizedPrivacyPath,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  error?: string;
  ta: Record<string, string>;
  localizedPolicyPath: string;
  localizedPrivacyPath: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Checkbox
          id="policy-agree"
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          className="shrink-0 h-3.5 w-3.5 rounded-full border border-muted-foreground/40 data-[state=checked]:border-primary data-[state=checked]:bg-transparent transition-all duration-200 [&_svg]:h-3 [&_svg]:w-3 [&_svg]:text-primary"
        />
        <div className="text-xs leading-none flex items-baseline gap-1 flex-wrap">
          <label htmlFor="policy-agree" className="cursor-pointer">
            {ta.policyAgree}
          </label>
          <a
            href={localizedPolicyPath}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:underline font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              window.open(localizedPolicyPath, '_blank', 'noopener,noreferrer');
            }}
          >
            {ta.policyTitle}
          </a>
          <span className="text-muted-foreground">&</span>
          <a
            href={localizedPrivacyPath}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:underline font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              window.open(localizedPrivacyPath, '_blank', 'noopener,noreferrer');
            }}
          >
            {ta.privacyPolicyTitle}
          </a>
        </div>
      </div>
      {error && <p className="text-sm text-destructive ml-6">{error}</p>}
    </div>
  );
}

export type BlockPopup = {
  type: 'maintenance' | 'suspended';
  message?: string;
  endAt?: string | null;
  until?: string | null;
  reason?: string | null;
} | null;

export function BlockPopupOverlay({
  blockPopup,
  onClose,
  ta,
  dateLocale,
}: {
  blockPopup: NonNullable<BlockPopup>;
  onClose: () => void;
  ta: Record<string, string>;
  dateLocale: Locale;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />
      <div className="relative z-50 w-full max-w-sm mx-4 bg-background border rounded-lg shadow-lg p-6 animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex flex-col items-center gap-3 mb-4">
          {blockPopup.type === 'maintenance' && (
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Wrench className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
          )}
          {blockPopup.type === 'suspended' && (
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
          )}
        </div>
        <h2 className="text-lg font-semibold text-center mb-2">
          {blockPopup.type === 'maintenance' ? ta.blockMaintenanceTitle : ta.blockSuspendedTitle}
        </h2>
        <div className="text-sm text-muted-foreground text-center space-y-1 mb-6">
          {blockPopup.type === 'maintenance' && (
            <>
              <p>{blockPopup.message || ta.blockMaintenanceDesc}</p>
              {blockPopup.endAt && (
                <p className="text-xs">
                  {ta.blockMaintenanceEstimate} {format(new Date(blockPopup.endAt), 'HH:mm dd/MM/yyyy', { locale: dateLocale })}
                </p>
              )}
            </>
          )}
          {blockPopup.type === 'suspended' && (
            <>
              <p>{ta.blockSuspendedDesc}</p>
              {blockPopup.until && (
                <p className="text-xs">
                  {ta.blockSuspendedUntil} {format(new Date(blockPopup.until), 'HH:mm dd/MM/yyyy', { locale: dateLocale })}
                </p>
              )}
              {blockPopup.reason && (
                <p className="text-xs">{ta.blockSuspendedReason} {blockPopup.reason}</p>
              )}
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center mb-4 flex items-center justify-center gap-1.5">
          <Mail className="w-3.5 h-3.5 shrink-0" />
          Liên hệ hỗ trợ:{' '}
          <a href="mailto:support@t-nexus.io.vn" className="text-primary hover:underline font-medium">
            support@t-nexus.io.vn
          </a>
        </p>
        <div className="flex justify-center">
          <Button onClick={onClose} className="min-w-[120px]">
            {ta.blockUnderstood}
          </Button>
        </div>
      </div>
    </div>
  );
}
