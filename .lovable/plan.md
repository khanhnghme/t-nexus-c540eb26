

## Phase 2 — Giai đoạn 4/4: Error handling, Edge cases & UI Polish

### Muc tieu
Hoàn thiện Phase 2 bằng cách xử lý các edge case, cải thiện error handling, và polish UI cho toàn bộ flow: tạo project → view canvas → auto-save.

### Hien trang
- ✅ Service layer + hooks CRUD hoạt động
- ✅ Auto-save + save indicator trong CanvasEditor
- ✅ CreateCustomProject tạo group + page + redirect
- ✅ GroupDetail phân luồng theo project_mode
- ❌ CanvasPageView chưa có nút tạo page khi empty (leader)
- ❌ Chưa handle trường hợp mất kết nối / save thất bại rõ ràng
- ❌ CanvasEditor chưa có loading skeleton khi hydrate content
- ❌ CreateCustomProject chưa handle duplicate idempotency_key gracefully

### Hanh dong cu the

**1. Cập nhật `CanvasPageView.tsx`** — Empty state cho leader + error retry
- Khi không có page nào + user là leader → hiện nút "Tạo trang đầu tiên" (gọi `useCreatePage`)
- Thêm nút retry khi fetch lỗi
- Hiện badge `project_mode: custom` nhỏ trên header

**2. Cập nhật `CanvasEditor.tsx`** — Error toast + save retry
- Khi auto-save thất bại → hiện toast error với message rõ ràng
- Save indicator: thêm trạng thái "Error" (màu đỏ) khi save fail
- Đổi save status text sang tiếng Việt (Đang lưu... / Đã lưu / Chưa lưu / Lỗi)

**3. Cập nhật `CreateCustomProject.tsx`** — Validation + UX
- Trim project name, validate min length (2 chars)
- Handle duplicate idempotency_key error → hiện toast "Project đã được tạo"
- Auto-select workspace nếu chỉ có 1 workspace
- Disable editor khi đang creating để tránh mất content

**4. Cập nhật `useAutosave.ts`** — Error callback
- Thêm `onError` callback option để caller có thể handle (toast, retry UI)
- Track `saveError` state để UI hiển thị

### Output
- Flow tạo + xem + edit hoạt động ổn định, xử lý lỗi rõ ràng
- UX mượt: empty state có action, error có retry, save có feedback đầy đủ
- Sẵn sàng chuyển sang Phase 3 (Mode Selector)

### Files thay doi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/CanvasPageView.tsx` | Empty state action + error retry |
| `src/components/canvas/CanvasEditor.tsx` | Error toast + Vietnamese labels + error state |
| `src/pages/CreateCustomProject.tsx` | Validation + duplicate handling + auto-select workspace |
| `src/hooks/useAutosave.ts` | Thêm `onError` callback + `saveError` state |

