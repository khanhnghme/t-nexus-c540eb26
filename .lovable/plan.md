

## Phase 12 — Hoàn thiện: Cover Image UI + Page Header

### Tình trạng hiện tại
- Stage 1 done: cột `cover_url` đã có trong DB
- Stage 2 done: `updatePage` service + `handleChangeCover` handler đã có trong `CanvasPageView.tsx`
- Icon/emoji picker đã hoạt động đầy đủ (Phase 11)
- Chưa có UI hiển thị cover, chưa có cách chọn/upload cover

### Công việc còn lại

**1. Tạo component `PageCoverImage.tsx`**

Component hiển thị cover image phía trên editor content:
- Nếu `cover_url` có giá trị: render ảnh/gradient full-width, chiều cao ~180px
- Nếu không có cover: không render gì (hoặc chỉ hiện nút "Add cover" khi hover, nếu editable)
- Nút "Change cover" và "Remove cover" hiện khi hover (chỉ edit mode)

**2. Tạo component `CoverPicker.tsx`**

Popover cho phép chọn cover:
- Tab 1 — Preset gradients: 8-10 gradient CSS đẹp (lưu dạng CSS string vào `cover_url`)
- Tab 2 — Preset solid colors: 6-8 màu solid
- Tab 3 — URL ảnh: input nhập URL ảnh bên ngoài
- Nút "Remove cover" để xóa

Không cần storage bucket — chỉ dùng gradient CSS và URL ảnh bên ngoài ở phase này.

**3. Tạo component `PageHeader.tsx`**

Header lớn kiểu Notion phía trên editor:
- Icon lớn (emoji, click để đổi nếu editable)
- Title lớn (editable inline nếu edit mode)
- Nút "Add icon" / "Add cover" hiện khi hover (nếu chưa có)

**4. Tích hợp vào `CanvasEditor.tsx`**

Thêm `PageHeader` + `PageCoverImage` phía trên `BlockNoteView`:
- Truyền `cover_url`, `icon`, `title`, `editable` từ `CanvasPageView`
- Gọi `handleChangeCover`, `handleChangePageIcon`, `handleRenamePage` qua props

**5. Cập nhật `CanvasPageView.tsx`**

- Truyền `activePage.cover_url`, `activePage.icon`, `activePage.title` xuống `CanvasEditor`
- Truyền callbacks: `onChangeCover`, `onChangeIcon`, `onRenameTitle`

### Preset gradients (ví dụ)

```text
linear-gradient(135deg, #667eea 0%, #764ba2 100%)
linear-gradient(135deg, #f093fb 0%, #f5576c 100%)
linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)
linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)
linear-gradient(135deg, #fa709a 0%, #fee140 100%)
linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)
linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)
linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)
```

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/PageCoverImage.tsx` | Mới — hiển thị cover |
| `src/components/canvas/CoverPicker.tsx` | Mới — chọn gradient/color/URL |
| `src/components/canvas/PageHeader.tsx` | Mới — header lớn với icon + title + actions |
| `src/components/canvas/CanvasEditor.tsx` | Thêm props, render PageHeader + PageCoverImage |
| `src/components/canvas/CanvasPageView.tsx` | Truyền cover_url/icon/title + callbacks xuống editor |

### Không làm
- Upload ảnh lên storage (có thể bổ sung sau)
- Slug routing (Phase 13)
- Template system (Phase 16)

