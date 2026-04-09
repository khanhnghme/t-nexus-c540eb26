

## Plan: Cải thiện trang Dịch vụ — bỏ nút quay lại, trực quan hơn, đỏ khi vượt limit

### Thay đổi

**1. Bỏ nút "Quay lại"** (dòng 167-173)
- Xóa hoàn toàn block `<button>` với `ArrowLeft` + `t.goBack`

**2. Progress bar & số liệu đổi đỏ khi vượt limit**

Tại tab Usage, mỗi card thống kê (Workspace, Projects, Members, Storage):
- Tính `isOver = current >= max` (khi max !== null)
- Nếu `isOver`:
  - Số liệu chính → `text-red-600 dark:text-red-400`
  - Progress bar → thêm class `[&>div]:bg-red-500` thay vì màu mặc định
  - Viền card → `border-red-500/30 bg-red-500/5`
- Nếu gần đầy (≥80%): Progress bar vàng `[&>div]:bg-amber-500`

Tương tự cho per-workspace breakdown cards.

**3. Trực quan hơn — icon màu cho từng card**

Mỗi card usage có icon riêng với màu riêng (thay vì tất cả `text-muted-foreground`):
- Workspace: `text-blue-500`
- Projects: `text-violet-500`  
- Members: `text-emerald-500`
- Storage: `text-orange-500`

Khi vượt limit thì icon cũng chuyển đỏ.

### Files

| File | Thay đổi |
|------|----------|
| `src/pages/ServicePlan.tsx` | Xóa nút back, thêm logic đổi màu đỏ khi over limit, icon màu |

