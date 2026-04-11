

## Phase 10 — Giai đoạn 2/4: Ẩn Slash Menu và Drag Handles ở View Mode

### Mục tiêu
Khi admin chuyển sang View mode (hoặc member/guest xem), ẩn các UI elements chỉ dành cho editing: slash menu (`/`), drag handles (kéo block), side menu, và formatting toolbar.

### Hiện trạng
- Stage 1 hoàn thành: toggle Edit/View button trên header, `isEditMode` state truyền xuống `CanvasEditor`
- `BlockNoteView` nhận `editable={false}` khi View mode — tuy nhiên một số UI elements như side menu, formatting toolbar vẫn có thể hiển thị tùy cấu hình

### Hành động

**Cập nhật `src/components/canvas/CanvasEditor.tsx`**
- Khi `editable=false`: truyền thêm props để ẩn side menu và formatting toolbar
  - `sideMenu={false}` — ẩn drag handle + add button bên trái block
  - `formattingToolbar={false}` — ẩn toolbar khi select text
  - `slashMenu={false}` — ẩn slash menu (/) 
- Kiểm tra BlockNoteView API: nếu dùng prop-based approach không khả thi thì wrap với conditional component overrides
- Thêm CSS class `.view-mode` lên container div khi `editable=false` để có thể target thêm bằng CSS nếu cần (ẩn cursor caret, padding adjustments)

### Chi tiết kỹ thuật

```text
Edit mode (editable=true):
  BlockNoteView: full UI — side menu, slash menu, formatting toolbar

View mode (editable=false):
  BlockNoteView: editable=false
  + sideMenu={false}
  + formattingToolbar={false}  
  + slashMenu={false}
  + CSS class "view-mode" trên container
```

### Không làm
- Styling cho view mode (giai đoạn 3)
- Permission check nâng cao (giai đoạn 4)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/CanvasEditor.tsx` | Ẩn side menu, slash menu, formatting toolbar khi view mode |

