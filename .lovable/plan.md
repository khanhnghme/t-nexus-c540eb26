

## Root Cause Analysis

The problem is that PayPal's `onApprove` JS callback **never fires** on the client side. The user approves payment in PayPal's popup, but the browser doesn't receive the callback (common in iframe/popup-blocked environments like Lovable preview).

Currently:
- `CHECKOUT.ORDER.APPROVED` webhook arrives → **webhook does nothing** (only handles `PAYMENT.CAPTURE.COMPLETED`)
- `PAYMENT.CAPTURE.COMPLETED` never arrives because capture was never called
- Order stays `pending` forever

## Solution: Server-side Auto-Capture via Webhook

### 1. Update `paypal-webhook/index.ts` — Handle `CHECKOUT.ORDER.APPROVED`

When PayPal sends `CHECKOUT.ORDER.APPROVED`, the webhook should:
- Find the matching order in DB
- If still `pending`, **auto-capture** the payment by calling PayPal's capture API server-side
- Then apply the same completion logic (update profile, plan, addons, etc.)

This makes the webhook a reliable fallback when `onApprove` fails client-side.

```text
CHECKOUT.ORDER.APPROVED webhook received
  → Find order by paypal_order_id
  → If status = 'pending' → Call PayPal capture API server-side
  → If capture succeeds → Run same completion logic as PAYMENT.CAPTURE.COMPLETED
```

### 2. Add client-side polling fallback in `CheckoutPayment.tsx` and `AddonCheckoutPayment.tsx`

After the PayPal button renders and user opens PayPal popup, start a background poller:
- Poll the order status from DB every 3-5 seconds
- If order status changes to `completed` (via webhook auto-capture), redirect to summary
- This ensures the UI reacts even if `onApprove` never fires

### Files to modify
- `supabase/functions/paypal-webhook/index.ts` — Add `CHECKOUT.ORDER.APPROVED` handler with server-side capture
- `src/pages/CheckoutPayment.tsx` — Add background polling after PayPal buttons are shown
- `src/pages/AddonCheckoutPayment.tsx` — Same polling logic

### Why this works
- **Webhook auto-capture**: Even if the browser loses the callback, PayPal's webhook reliably notifies us. We capture server-side.
- **Client polling**: The UI detects the order was completed (by webhook) and redirects accordingly.
- **Double protection**: If `onApprove` DOES fire, the existing capture flow works. The webhook will see `already completed` and skip. Fully idempotent.

