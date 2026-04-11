

## Phase 2 — Page Management: Giai đoạn 1/2 (Database / Logic)

Phase 1 đã hoàn thành: editor hoạt động, autosave, tạo page mới. Phase 2 tập trung vào **quản lý pages**: đổi tên, xóa, sắp xếp lại, icon emoji.

### Thay đổi Database

**1. Migration**
- Thêm cột `icon` (TEXT, nullable) vào bảng `project_pages` — lưu emoji cho mỗi page
- Tạo trigger `updated_at` tự động cập nhật khi row thay đổi (hiện đang set thủ công trong code)

**2. Cập nhật RLS policies**
- Hiện tại chỉ leader (via `is_project_leader`) mới INSERT/UPDATE/DELETE
- Giữ nguyên — không thay đổi RLS trong phase này
- Lý do: chỉ leader mới nên quản lý pages (rename, delete, reorder)

### Thay đổi Logic (trong code)

**3. `CustomProjectView.tsx` — Thêm handlers**
- `handleRenamePage(pageId, newTitle)` — update title trong DB + state
- `handleDeletePage(pageId)` — delete page, auto-select page khác
- `handleReorderPages(reorderedPages)` — update `display_order` batch
- `handleUpdateIcon(pageId, icon)` — update icon emoji

**4. `NotionPageList.tsx` — Cập nhật PageItem type**
- Thêm `icon?: string` vào `PageItem` interface
- Thêm props cho rename, delete, reorder handlers (chưa render UI — để giai đoạn 2)

**5. `CustomProjectView.tsx` — Fetch thêm icon**
- Select thêm `icon` trong query `fetchPages`

### Chưa làm trong giai đoạn này
- UI cho rename/delete/reorder (giai đoạn 2)
- Drag-drop reorder (giai đoạn 2)
- Emoji picker (giai đoạn 2)

### Files cần sửa

| File | Thay đổi |
|------|----------|
| Migration SQL | Thêm `icon` + trigger `updated_at` |
| `src/components/notion/CustomProjectView.tsx` | Thêm handlers + fetch icon |
| `src/components/notion/NotionPageList.tsx` | Cập nhật PageItem type + thêm handler props |

