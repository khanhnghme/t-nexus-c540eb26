

## Phase 12 — Giai đoạn 1/4: Thêm cột cover_url vào project_pages

### Mục tiêu
Thêm cột `cover_url` (TEXT, nullable) vào bảng `project_pages` để lưu ảnh cover cho mỗi page.

### Hiện trạng
- Page icon (emoji) đã hoạt động đầy đủ: `EmojiPicker`, `icon` column, hiển thị sidebar + header
- Chưa có cột `cover_url` trong `project_pages`
- Chưa có UI upload/hiển thị cover image

### Hành động

**Database migration:**
```sql
ALTER TABLE public.project_pages
  ADD COLUMN IF NOT EXISTS cover_url TEXT DEFAULT NULL;
```

Chỉ 1 câu lệnh duy nhất — thêm cột nullable, không ảnh hưởng data hiện có.

### Không làm
- UI upload/hiển thị cover (giai đoạn 2-3)
- Preset gradients (giai đoạn 3)
- Cập nhật service/hooks (giai đoạn 2)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| Migration SQL | `ALTER TABLE` thêm `cover_url` |

