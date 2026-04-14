

## Plan: Thêm dòng "Tax / VAT (0%)" vào Checkout Step 1 & Step 2

Hiện tại dòng "Tax / VAT (0%)" chỉ được plan thêm vào Summary và bản in, nhưng chưa có ở 2 trang checkout. Cần thêm vào cả 2 nơi để nhất quán.

### Files thay đổi

**1. `src/pages/Checkout.tsx`** (Step 1 — Order Summary card, ~line 592)
- Thêm dòng "Tax / VAT (0%) — $0.00" ngay sau Separator và trước dòng Total:
```tsx
<div className="flex justify-between text-sm text-muted-foreground">
  <span>{isVi ? 'Thuế VAT (0%)' : 'Tax / VAT (0%)'}</span>
  <span>$0.00</span>
</div>
```

**2. `src/pages/CheckoutPayment.tsx`** (Step 2 — Totals section, ~line 414)
- Thêm dòng tương tự ngay trước Separator và dòng Total:
```tsx
<div className="flex justify-between text-sm text-muted-foreground">
  <span>{isVi ? 'Thuế VAT (0%)' : 'Tax / VAT (0%)'}</span>
  <span>$0.00</span>
</div>
```

**3. Các file đã plan trước đó** (Summary, InvoiceTemplate, PDF) — vẫn thực hiện theo plan đã duyệt.

**4. Deploy** edge function `payment-confirmation-email` để cập nhật PDF.

### Tổng cộng: 4 files code + 1 deploy

