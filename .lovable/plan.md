

## Phase 2 — Giai đoạn 1/4: Service layer & Hook cho Project Pages CRUD

### Mục tiêu
Tạo service layer và React hook để đọc/ghi `project_pages` từ database. Đây là nền tảng để giai đoạn sau (auto-save, load content) hoạt động.

### Hiện trạng
- ✅ Bảng `project_pages` đã có: `id`, `group_id`, `title`, `content` (JSONB), `display_order`, `slug`, `icon`, `created_by`, timestamps
- ✅ RLS policies đầy đủ (member SELECT, leader INSERT/UPDATE/DELETE, system admin ALL, public SELECT)
- ✅ `CanvasEditor` component hoạt động, trang `/create-custom` render được
- ❌ Chưa có service/hook nào tương tác với `project_pages`
- ❌ `handleCreate` trong `CreateCustomProject.tsx` chỉ `console.log`

### Hành động cụ thể

**1. Tạo `src/services/projectPages.ts`** — Service layer thuần

```typescript
// Các hàm:
// - fetchPagesByGroupId(groupId) → SELECT * FROM project_pages WHERE group_id = ? ORDER BY display_order
// - createPage({ group_id, title, content, created_by, display_order }) → INSERT
// - updatePageContent(pageId, content) → UPDATE content, updated_at
// - deletePage(pageId) → DELETE
// - upsertPage({ id?, group_id, title, content, ... }) → UPSERT (cho auto-save sau này)
```

**2. Tạo `src/hooks/useProjectPages.ts`** — React Query hook

- `useProjectPages(groupId)` — fetch all pages cho một project, cached với React Query
- `useCreatePage()` — mutation tạo page mới
- `useUpdatePageContent()` — mutation cập nhật content
- `useDeletePage()` — mutation xóa page
- Invalidate query cache sau mỗi mutation

**3. Tạo type `ProjectPage` trong `src/types/database.ts`**

```typescript
export interface ProjectPage {
  id: string;
  group_id: string;
  title: string;
  slug: string | null;
  content: any; // JSONB — BlockNote document
  display_order: number;
  icon: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

### Output
- Service functions sẵn sàng gọi Supabase SDK cho project_pages CRUD
- React Query hooks sẵn sàng dùng trong components
- Type-safe với `ProjectPage` interface
- Chưa kết nối vào UI — giai đoạn 2 sẽ wire vào `CreateCustomProject` và auto-save

### Rủi ro
- `content` column là `Json` type trong Supabase types — cần cast khi dùng với BlockNote `Block[]`
- React Query cache key phải unique theo `groupId` để tránh stale data giữa các project

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/types/database.ts` | Thêm `ProjectPage` interface |
| `src/services/projectPages.ts` | **Mới** — CRUD functions cho project_pages |
| `src/hooks/useProjectPages.ts` | **Mới** — React Query hooks |

