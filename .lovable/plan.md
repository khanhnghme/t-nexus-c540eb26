

## Phase 10 — Giai đoạn 1/4: Toggle Edit/View Mode cho Admin

### Mục tiêu
Thêm nút toggle cho phép Admin/Owner chuyển giữa chế độ "Chỉnh sửa" và "Xem trước" trên header của Canvas. Member/Guest luôn ở chế độ View.

### Hiện trạng
- `CanvasPageView` nhận prop `editable` từ `GroupDetail.tsx` (dựa trên `isLeaderInGroup`)
- `editable` được truyền thẳng xuống `CanvasEditor` → `BlockNoteView`
- Chưa có UI toggle để admin xem trước (preview) trang trước khi publish

### Hành động

**Cập nhật `src/components/canvas/CanvasPageView.tsx`**
- Thêm state `isEditMode` (default: `true` khi `editable=true`)
- Truyền `isEditMode` (thay vì `editable`) xuống `CanvasEditor` và `CanvasSidebar`
- Thêm toggle button trên header bar (cạnh tên page):
  - Icon: `Pencil` (edit) / `Eye` (view)
  - Tooltip: "Chế độ chỉnh sửa" / "Chế độ xem trước"
  - Chỉ hiển thị khi `editable=true` (admin/owner)
- Khi ở View mode: ẩn nút tạo trang, ẩn nút xóa/rename trên sidebar

### Chi tiết kỹ thuật

```text
Header bar (admin):
┌──────────────────────────────────────────┐
│ [≡] 📄 Trang 1          [✏️ Sửa | 👁 Xem] │
└──────────────────────────────────────────┘

editable=true + isEditMode=true  → full editing
editable=true + isEditMode=false → preview (view-only)
editable=false                   → view-only, no toggle
```

### Không làm
- Ẩn slash menu / drag handles (giai đoạn 2)
- Styling cho view mode (giai đoạn 3)
- Permission check nâng cao (giai đoạn 4)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/CanvasPageView.tsx` | Toggle state + button UI |

