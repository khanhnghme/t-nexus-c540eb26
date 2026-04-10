import { Check } from 'lucide-react';
import gmailLogo from '@/assets/gmail-logo.png';
import googleDriveLogo from '@/assets/google-drive-logo.png';
import googleCalendarLogo from '@/assets/google-calendar-logo.png';

export const GOOGLE_INTEGRATIONS = [
  { logo: gmailLogo, label: 'Email Integration', fullLabel: 'Email Integration — View & manage emails in one place' },
  { logo: googleDriveLogo, label: 'Google Drive', fullLabel: 'Google Drive — Access & submit files from Drive' },
  { logo: googleCalendarLogo, label: 'Calendar Sync', fullLabel: 'Calendar Sync — Two-way real-time sync' },
];

export function shouldShowIntegrations(planKey: string): boolean {
  const key = planKey.replace(/^plan_/, '').toLowerCase();
  return ['pro', 'business', 'enterprise', 'custom'].includes(key);
}

/**
 * Notion-style Connected Tools section (inline styles) — for Pricing / Upgrade pages
 */
export function ConnectedToolsInline({ detailed = true }: { detailed?: boolean }) {
  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(55,53,47,0.09)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#37352f', margin: 0 }}>Connected Tools</p>
      {GOOGLE_INTEGRATIONS.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={15} style={{ color: '#2383e2', flexShrink: 0 }} strokeWidth={2.5} />
          <img src={item.logo} alt={item.label} style={{ width: 16, height: 16, flexShrink: 0, objectFit: 'contain' }} />
          <span style={{ fontSize: 13, color: '#37352f', lineHeight: 1.4 }}>{detailed ? item.fullLabel : item.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Tailwind-styled Connected Tools section — for ServicePlan / Settings pages
 */
export function ConnectedToolsTailwind({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'mt-2 pt-2 border-t border-border/50 space-y-1' : 'mt-4 pt-3 border-t border-border/50 space-y-2'}>
      <p className={`font-semibold text-foreground m-0 ${compact ? 'text-xs' : 'text-[13px]'}`}>Connected Tools</p>
      {GOOGLE_INTEGRATIONS.map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <Check size={compact ? 13 : 15} className="text-primary shrink-0" strokeWidth={2.5} />
          <img src={item.logo} alt={item.label} className={`shrink-0 object-contain ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
          <span className={`text-muted-foreground leading-relaxed ${compact ? 'text-xs' : 'text-[13px]'}`}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Tiny version for onboarding plan cards
 */
export function ConnectedToolsMini({ color }: { color: string }) {
  return (
    <div className="mt-1.5 pt-1.5 border-t border-border/30 space-y-0.5">
      <p className="text-[10px] font-semibold text-foreground m-0">Connected Tools</p>
      {GOOGLE_INTEGRATIONS.map(item => (
        <div key={item.label} className="flex items-center gap-1">
          <Check size={10} className={`shrink-0 ${color}`} strokeWidth={2.5} />
          <img src={item.logo} alt={item.label} className="w-3 h-3 shrink-0 object-contain" />
          <span className="text-[10px] text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
