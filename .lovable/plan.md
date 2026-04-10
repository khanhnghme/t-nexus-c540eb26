

## Plan: Fix Onboarding Checkout UI & Prevent Back-Navigation After Payment

### Issues Found

**Issue 1: User can navigate back to checkout after successful payment**
On the **finish** step (line 1808), the "Back" button calls `goBack()` which navigates back to the **checkout** step. After a successful payment, this allows users to see the payment form again and potentially re-submit. The `goBack` function has no guard against this.

**Issue 2: Checkout step visible in sidebar even after payment completes**
When `paymentStatus === 'success'` and the user is on the finish step, the checkout step still appears clickable in the sidebar stepper. There's no logic to mark checkout as "done" or prevent re-entry.

### Solution

#### 1. Block back-navigation after payment success (`FirstTimeOnboarding.tsx`)
- In `goBack()`: if `paymentStatus === 'success'` and `currentStep === 'finish'`, skip the checkout step and go directly to the **plan** step instead.
- Alternatively, hide the "Back" button entirely on the finish step when payment was successful (user already paid, no reason to go back).

#### 2. Disable checkout step re-entry after payment
- When `paymentStatus === 'success'`, prevent the sidebar stepper from allowing click-navigation back to the checkout step.
- On the finish step after paid plan: remove or disable the "Back" button, or change it to only go back to info/plan (skip checkout).

#### 3. Show payment confirmation on finish step
- When the user paid successfully, show a small confirmation badge (e.g., green "Payment Confirmed" badge) next to the plan info on the finish step, so they know the payment was processed.

### Technical Details

**File: `src/components/FirstTimeOnboarding.tsx`**

1. **`goBack` function (line 228-237)**: Add a guard:
   ```typescript
   const goBack = () => {
     // After payment success, skip checkout step when going back from finish
     if (currentStep === 'finish' && paymentStatus === 'success') {
       // Go back to plan step (skip checkout)
       const planIndex = allSteps.indexOf('plan');
       if (planIndex >= 0) {
         setCurrentStepIndex(planIndex);
         return;
       }
     }
     // ... existing logic
   };
   ```

2. **Finish step UI (line 1807-1810)**: When `paymentStatus === 'success'`, either hide the Back button or show a "Payment Confirmed" indicator instead.

3. **Sidebar stepper**: Disable clicking on the checkout step when `paymentStatus === 'success'`.

### Files to Edit
| File | Change |
|------|--------|
| `src/components/FirstTimeOnboarding.tsx` | Block back-nav after payment, update finish step UI |

