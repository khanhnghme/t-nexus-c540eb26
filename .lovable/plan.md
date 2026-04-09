

## Plan: Đợt 2 — Module 2 (Lịch sử thanh toán) + Module 3 (Lịch sử thay đổi gói)

### Scope
Thay thế 2 tab placeholder (Payments + Plan History) trong `AdminUserBilling.tsx` bằng UI đầy đủ. DB đã sẵn sàng từ Đợt 1.

### 1. Component `UserPaymentsTab.tsx`
- Query `payment_history` WHERE `user_id = userId`, sắp xếp theo `created_at DESC`
- Bộ lọc: search (transaction_id/order_id), filter by status, filter by payment_method, date range
- Bảng hiển thị: Transaction ID, Plan, Amount (final_amount), Method, Status (badge màu), Paid At
- Click row → mở `PaymentDetailDialog` hiện đầy đủ thông tin: order_id, invoice_id, original_amount, discount_amount, coupon_code, description, system_note
- Nút xuất CSV toàn bộ giao dịch
- Empty state khi chưa có giao dịch

### 2. Component `PaymentDetailDialog.tsx`
- Dialog hiển thị chi tiết 1 giao dịch
- Layout 2 cột: thông tin giao dịch (IDs, amounts, method, status) + thông tin bổ sung (coupon, description, system_note)
- Badge màu cho status: paid (green), pending (amber), failed/cancelled (red), refunded (violet), chargeback (destructive)

### 3. Component `UserPlanHistoryTab.tsx`
- Query `plan_change_logs` WHERE `user_id = userId`, sắp xếp theo `created_at DESC`
- Hiển thị dạng **timeline dọc** với:
  - Icon theo action_type (ArrowUpCircle=upgrade, ArrowDownCircle=downgrade, Calendar=renew, ShieldOff=suspend, ShieldCheck=restore, etc.)
  - Màu theo action_type
  - Nội dung: "Upgraded from Free → Plus" (dùng old_plan/new_plan)
  - Performed by: fetch profile name từ performed_by UUID, hoặc "System"
  - Change source badge
  - Reason + internal_note (collapsible)
  - Effective mode badge (immediate / next_cycle)
  - Thời gian: format relative + absolute
- Bộ lọc: action_type, change_source, date range
- Empty state

### 4. Cập nhật `AdminUserBilling.tsx`
- Import 2 component mới
- Thay placeholder của tab `payments` → `<UserPaymentsTab userId={userId} />`
- Thay placeholder của tab `history` → `<UserPlanHistoryTab userId={userId} />`

### 5. i18n — thêm chuỗi
- `en.ts` + `vi.ts`: block `adminBilling.payments` (~20 chuỗi: table headers, filter labels, status labels, detail dialog labels, empty state, export button)
- `en.ts` + `vi.ts`: block `adminBilling.planHistory` (~15 chuỗi: action type labels, source labels, effective mode labels, empty state, filter labels)

### Files

| File | Thay đổi |
|------|----------|
| `src/components/admin/UserPaymentsTab.tsx` | Component mới: bảng giao dịch + filters + CSV export |
| `src/components/admin/PaymentDetailDialog.tsx` | Component mới: dialog chi tiết giao dịch |
| `src/components/admin/UserPlanHistoryTab.tsx` | Component mới: timeline thay đổi gói |
| `src/pages/AdminUserBilling.tsx` | Import + sử dụng 2 tab mới |
| `src/lib/i18n/en.ts` | Thêm chuỗi payments + planHistory |
| `src/lib/i18n/vi.ts` | Thêm chuỗi payments + planHistory |

