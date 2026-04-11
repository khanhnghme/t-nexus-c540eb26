import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPlanLabel } from '@/lib/planConfig';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Crown, Zap, Check, RefreshCw } from 'lucide-react';
import { ConnectedToolsTailwind, shouldShowIntegrations } from '@/components/ConnectedToolsBadge';

export default function ServicePlanSection() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { translations: { app: { servicePlanSection: t, servicePlanFeatures: featuresMap } } } = useLanguage();

  const plan = profile?.user_plan || 'plan_free';
  const planName = getPlanLabel(plan);
  const isPremium = plan !== 'plan_free';
  const features = featuresMap[plan] || featuresMap.plan_free;
  const nextPlan = profile?.next_plan || null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isPremium ? 'bg-amber-500/10' : 'bg-muted'}`}>
            {isPremium ? (
              <Crown className="w-5 h-5 text-amber-500" />
            ) : (
              <Zap className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{t.title}</span>
              <Badge
                variant="secondary"
                className={`text-xs ${isPremium
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : ''
                }`}
              >
                {planName}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPremium ? t.premiumActive : t.freeBasic}
            </p>
            {nextPlan && (
              <p className="text-xs text-blue-500 mt-0.5">
                {(t.nextPlanFrom || '→ {plan} from {date}')
                  .replace('{plan}', getPlanLabel(nextPlan))
                  .replace('{date}', profile?.plan_expires_at
                    ? new Date(profile.plan_expires_at).toLocaleDateString()
                    : '—')}
              </p>
             )}
            {isPremium && (
              <div className="flex items-center gap-1.5 text-xs mt-0.5">
                <RefreshCw className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">{t.autoRenewLabel}:</span>
                <span className={profile?.auto_renew ? 'text-emerald-500 font-medium' : 'text-orange-500 font-medium'}>
                  {profile?.auto_renew ? t.autoRenewOn : t.autoRenewOff}
                </span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-1.5">
          {features.map((f: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-muted-foreground">{f}</span>
            </div>
          ))}
          <ConnectedToolsTailwind compact planKey={plan} />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => navigate('/service-plan')}
          >
            {t.viewDetails}
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => navigate('/upgrade?from=personal')}
          >
            <Zap className="w-3.5 h-3.5 mr-1" />
            {t.upgrade}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
