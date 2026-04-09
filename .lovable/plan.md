

## Plan: Redesign trang Add-on Tab thành 2-step checkout

### Vấn đề hiện tại
- Tab Add-on hiển thị "Tổng chi phí add-on: $39.84/tháng" bao gồm cả add-on đã mua lẫn mới → gây hiểu lầm
- Không có tổng quan add-on hiện có vs. add-on mua thêm
- Flow mua thêm chưa rõ ràng 2 step như checkout plan

### Giải pháp: Chia Tab Add-on thành 2 phần rõ ràng

**Phần 1 — Tổng quan Add-on hiện có (read-only)**
- Card hiển thị add-on đã sở hữu: loại, số lượng, giới hạn hiện tại (base + bonus)
- Progress bar usage cho mỗi loại
- Nếu chưa có add-on nào → hiển thị "Chưa có gói bổ sung nào"

**Phần 2 — Mua thêm Add-on (Step 1: chọn số lượng)**
- Tách riêng section "Mua thêm gói bổ sung"
- 3 card cho projects/storage/members với +/- buttons (bắt đầu từ 0, không phải từ số hiện có)
- Mỗi card chỉ hiển thị số lượng mua MỚI và giá gốc cho phần mua mới
- Footer: Tạm tính gốc → Tiết kiệm add-on (nếu có) → Tổng thanh toán
- Nút "Tiến hành thanh toán" → navigate sang `/addon-checkout` (Step 2 đã có)

### Thay đổi cụ thể

**File: `src/pages/ServicePlan.tsx` — Tab addon (line ~638-832)**

1. **Xóa** `localAddons` sync từ DB (line 94-103) — không cần nữa vì mua mới bắt đầu từ 0
2. **Thêm state mới** `newAddons` = `{ projects: 0, storage: 0, members: 0 }` cho phần mua thêm
3. **Phần 1 — Tổng quan**: Render card read-only cho mỗi addon type từ `userAddons.getQuantity()`, hiển thị usage + progress
4. **Phần 2 — Mua thêm**: +/- controls thao tác trên `newAddons` (delta bắt đầu từ 0)
5. **Footer**: Chỉ hiển thị giá cho phần mua mới:
   - Tạm tính: `totalNewQty × addonBasePrice`
   - Tiết kiệm: nếu plan có discount
   - Tổng: `totalNewQty × unitPrice`
6. **Nút thanh toán**: Navigate `/addon-checkout?projects=N&storage=N&members=N` (chỉ gửi delta > 0)
7. **Xóa** "Tổng chi phí add-on" gây hiểu lầm

### Files cần sửa
- `src/pages/ServicePlan.tsx`

