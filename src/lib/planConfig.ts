/**
 * Single Source of Truth for all plan metadata.
 * Every component displaying plan info MUST import from here.
 */

export const PLAN_ORDER = ['plan_free', 'plan_plus', 'plan_pro', 'plan_business', 'plan_custom'] as const;
export type PlanKey = typeof PLAN_ORDER[number];

export interface PlanMeta {
  label: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  addonDiscount: number;
  color: string;          // Tailwind text color
  bgClass: string;        // Light background
  badgeClass: string;     // Full badge styling
  rank: number;
}

export const PLAN_CONFIG: Record<PlanKey, PlanMeta> = {
  plan_free: {
    label: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    addonDiscount: 0,
    color: 'text-muted-foreground',
    bgClass: 'bg-muted',
    badgeClass: 'bg-muted text-muted-foreground',
    rank: 0,
  },
  plan_plus: {
    label: 'Plus',
    monthlyPrice: 4.8,
    yearlyPrice: 48,
    addonDiscount: 0.10,
    color: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    rank: 1,
  },
  plan_pro: {
    label: 'Pro',
    monthlyPrice: 12,
    yearlyPrice: 120,
    addonDiscount: 0.20,
    color: 'text-violet-500',
    bgClass: 'bg-violet-500/10',
    badgeClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    rank: 2,
  },
  plan_business: {
    label: 'Business',
    monthlyPrice: 24,
    yearlyPrice: 240,
    addonDiscount: 0.20,
    color: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    rank: 3,
  },
  plan_custom: {
    label: 'Enterprise',
    monthlyPrice: null,
    yearlyPrice: null,
    addonDiscount: 0,
    color: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    rank: 4,
  },
};

/** Get display label for a plan key */
export const getPlanLabel = (plan: string | null): string =>
  PLAN_CONFIG[plan as PlanKey]?.label ?? 'Free';

/** Get badge CSS class for a plan */
export const getPlanBadgeClass = (plan: string | null): string =>
  PLAN_CONFIG[plan as PlanKey]?.badgeClass ?? PLAN_CONFIG.plan_free.badgeClass;

/** Get text color class for a plan */
export const getPlanColor = (plan: string | null): string =>
  PLAN_CONFIG[plan as PlanKey]?.color ?? PLAN_CONFIG.plan_free.color;

/** Get plan rank for comparison (higher = better plan) */
export const getPlanRank = (plan: string | null): number =>
  PLAN_CONFIG[plan as PlanKey]?.rank ?? 0;

/** Check if a plan is premium (non-free) */
export const isPremiumPlan = (plan: string | null): boolean =>
  (PLAN_CONFIG[plan as PlanKey]?.rank ?? 0) > 0;

/** Get monthly price for a plan (null for custom) */
export const getPlanMonthlyPrice = (plan: string | null): number | null =>
  PLAN_CONFIG[plan as PlanKey]?.monthlyPrice ?? null;

/**
 * @deprecated Use getPlanLabel from '@/lib/planConfig' instead
 */
export const formatPlanName = (plan: string | null): string => getPlanLabel(plan);
