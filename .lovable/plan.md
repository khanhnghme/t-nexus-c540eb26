

## Plan: Fix Payment Flow in Onboarding

### Root Cause Analysis

Three bugs found in `FirstTimeOnboarding.tsx`:

1. **`handleFinish` overwrites paid plan**: Line 370 hardcodes `user_plan: 'plan_free'` — this RESETS the plan back to free even after successful payment. The backend already sets the correct plan during capture/webhook, so this line destroys it.

2. **Back button allows returning to checkout**: `goBack()` has no guard for `paymentStatus === 'success'`, so users can navigate back to the payment step after paying.

3. **Steps not updated after payment**: `allSteps` depends on `selectedPlan` but doesn't account for `paymentStatus === 'success'`. After successful payment, the 'plan' and 'checkout' steps should be removed from the sidebar and navigation.

### Changes (single file: `FirstTimeOnboarding.tsx`)

**Fix 1 — Don't overwrite plan in handleFinish**
- When `paymentStatus === 'success'`, remove `user_plan` from `updateData` entirely (backend already set it correctly via capture-paypal-order)
- Only set `user_plan: 'plan_free'` when no payment was made (free plan selected)

**Fix 2 — Block back navigation after payment**
- In `goBack()`: if `paymentStatus === 'success'` and current step is 'finish', do nothing (or skip over plan/checkout steps directly to 'info')

**Fix 3 — Remove plan/checkout steps from sidebar after payment**
- Update `allSteps` memo to exclude 'plan' and 'checkout' when `paymentStatus === 'success'`
- This removes them from the sidebar and prevents any navigation to those steps

**Fix 4 — Refresh profile after payment**
- In `onApprove`: call `refreshProfile()` (from props/context) after successful capture, before calling `goNext()`, so the parent component has the updated plan immediately

### Files to edit
| File | Change |
|---|---|
| `src/components/FirstTimeOnboarding.tsx` | Fix all 4 issues above |

