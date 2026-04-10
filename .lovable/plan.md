

## Plan: Fix Onboarding Payment Flow — 401 Error, Plan Reset Bug & Auto-Advance

### Issues Found

**Issue 1: Edge function 401 — stale deployed code**
The deployed `create-paypal-order` function contains `supabase.auth.getClaims()` which doesn't exist. The local code is correct but hasn't been deployed. Both PayPal functions need redeployment.

**Issue 2: CRITICAL — `handleFinish` resets plan to Free**
Line 378 in `FirstTimeOnboarding.tsx` hardcodes `user_plan: 'plan_free'` in the profile update. When the user clicks "Enter System" after paying, it **overwrites** the plan that `capture-paypal-order` just set. This is why the user loses their paid plan.

**Issue 3: Stuck on checkout step after payment success**
After `onApprove` succeeds, `goNext()` is called to advance to the finish step, but the checkout sub-step 2 UI doesn't show a success state before transitioning — user just sees "Confirm & Pay" with a brief flash.

### Solution

#### 1. Redeploy edge functions
Deploy both `create-paypal-order` and `capture-paypal-order` to sync local code → production.

#### 2. Fix plan reset in `handleFinish` (`FirstTimeOnboarding.tsx`, line 378)
- Remove the hardcoded `user_plan: 'plan_free'` line
- If user paid (paymentStatus === 'success'), do NOT touch `user_plan` — it's already set by the edge function
- Only set `user_plan: 'plan_free'` if the user chose Free plan and didn't pay

#### 3. Auto-advance checkout after payment success
- In `onApprove`, after successful capture, show a brief "Payment successful" state on the checkout step (1-2 seconds) before calling `goNext()` to finish step
- Call `refreshProfile` (from props/onComplete) so the finish step shows the correct plan badge

#### 4. Refresh profile after payment
- After `capture-paypal-order` succeeds, fetch the updated profile so the plan badge on the finish step reflects the purchased plan (not the old Free plan)

### Technical Details

**File: `src/components/FirstTimeOnboarding.tsx`**

1. **Line 378** — Change from:
   ```typescript
   user_plan: 'plan_free' as const,
   ```
   To conditional logic:
   ```typescript
   ...(paymentStatus !== 'success' && selectedPlan === 'plan_free' 
     ? { user_plan: 'plan_free' } 
     : {}),
   ```

2. **`onApprove` callback (line 460-479)** — After successful capture:
   - Call a profile refresh to get updated plan data
   - Add a small delay before `goNext()` to show success state on checkout
   - Update local plan display state

3. **Checkout sub-step 2 UI** — When `paymentStatus === 'success'`, replace the payment form with a success confirmation card (green checkmark + "Payment Confirmed" message) before auto-advancing to finish.

### Files to Edit
| File | Change |
|------|--------|
| `src/components/FirstTimeOnboarding.tsx` | Fix plan reset, add success UI on checkout, refresh profile after payment |
| Edge functions (deploy only) | Redeploy `create-paypal-order` and `capture-paypal-order` |

