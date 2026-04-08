import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatPlanName } from '@/hooks/useWorkspaceBilling';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Crown, Zap, Check, ArrowRight, Loader2 } from 'lucide-react';

const PLAN_FEATURES_SHORT: Record<string, string[]> = {
  plan_free: ['1 Workspace', '2 Projects / WS', '5 thành viên', '250 MB', 'Upload 5 MB/file'],
  plan_plus: ['3 Workspaces', '6 Projects / WS', '12 thành viên', '5 GB', 'Upload 100 MB/file'],
  plan_pro: ['10 Workspaces', '15 Projects / WS', '50 thành viên', '25 GB', 'Upload 5 GB/file'],
  plan_business: ['30 Workspaces', '50 Projects / WS', '200 thành viên', '100 GB', 'Upload 5 GB/file'],
  plan_custom: ['Không giới hạn', 'Không giới hạn', 'Không giới hạn', 'Không giới hạn', 'Upload 5 GB/file'],
};

export default function ServicePlanSection() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const plan = profile?.user_plan || 'plan_free';
  const planName = formatPlanName(plan);
  const isPremium = plan !== 'plan_free';
  const features = PLAN_FEATURES_SHORT[plan] || PLAN_FEATURES_SHORT.plan_free;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 space-y-4">
        {/* Plan header */}
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
              <span className="font-semibold text-sm">Gói dịch vụ</span>
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
              {isPremium ? 'Gói cao cấp đang hoạt động' : 'Gói miễn phí cơ bản'}
            </p>
          </div>
        </div>

        <Separator />

        {/* Features */}
        <div className="space-y-1.5">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-muted-foreground">{f}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => navigate('/service-plan')}
          >
            Xem chi tiết
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => navigate('/upgrade?from=personal')}
          >
            <Zap className="w-3.5 h-3.5 mr-1" />
            Nâng cấp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
