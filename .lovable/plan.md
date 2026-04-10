

## Plan: Fix payment flow — auto-redirect and status sync

### Problem
After successful PayPal capture, the order status may not be updated in the database immediately (race condition between capture response and webhook). The UI stays on Step 2 or shows a spinner indefinitely.

### Changes

#### 1. `src/pages/CheckoutPayment.tsx`
- Add polling after `capture-paypal-order` returns: poll order status up to 10 times (2s interval) until `status !== 'pending'`
- Once status is `completed`/`failed`/`cancelled`/`expired` → navigate to `/checkout/summary/{orderCode}`
- If polling exhausts retries, still navigate to summary (let summary page handle display)
- Remove the intermediate spinner state that blocks UI indefinitely (lines 140-146) — replace with auto-redirect logic

#### 2. `src/pages/AddonCheckoutPayment.tsx`
- Same polling mechanism after `captureOrder` succeeds
- On failure, also redirect to summary instead of staying on payment page
- Add polling fallback for async webhook delays

#### 3. Both files — reload protection
- Already have redirect logic on load (lines 59-61 in CheckoutPayment, 64-66 in AddonCheckoutPayment) — this is correct
- Add `failed` to the redirect status list if not already present (both already include `completed`, `cancelled`, `expired` — need to verify `failed` is included)

### Polling implementation (shared logic)
```typescript
const pollOrderStatus = async (orderCode: string, maxAttempts = 10, interval = 2000) => {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await supabase
      .from('orders')
      .select('status')
      .eq('order_code', orderCode)
      .single();
    if (data && data.status !== 'pending') return data.status;
    await new Promise(r => setTimeout(r, interval));
  }
  return null; // timeout
};
```

### Files

| File | Action |
|---|---|
| `src/pages/CheckoutPayment.tsx` | Edit — add polling after capture, fix redirect logic |
| `src/pages/AddonCheckoutPayment.tsx` | Edit — add polling after capture, redirect on failure |

