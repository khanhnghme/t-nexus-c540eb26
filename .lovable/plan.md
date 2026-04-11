

## Chuẩn hóa URL: `/pr/ws-{wsShortId}/{project-slug}` và `/pa/ws-{wsShortId}/{page-slug}`

### Tóm tắt

Thay đổi toàn bộ cấu trúc URL cho project và page. Thêm cột `short_id` vào bảng `workspaces`. Cập nhật routing, URL helpers, và tất cả navigation calls. Giữ redirect cho URL cũ.

### 1. Migration: Thêm `short_id` cho workspaces

```sql
ALTER TABLE public.workspaces ADD COLUMN short_id text;

-- Generate unique 8-char alphanumeric short_id for existing workspaces
UPDATE public.workspaces SET short_id = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

ALTER TABLE public.workspaces ALTER COLUMN short_id SET NOT NULL;
CREATE UNIQUE INDEX idx_workspaces_short_id ON public.workspaces(short_id);

-- Auto-generate on insert
CREATE OR REPLACE FUNCTION generate_workspace_short_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.short_id IS NULL THEN
    NEW.short_id := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_workspace_short_id
  BEFORE INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION generate_workspace_short_id();
```

### 2. `src/types/database.ts` — Thêm `short_id` vào Workspace interface

```ts
export interface Workspace {
  // ...existing fields
  short_id: string;
}
```

### 3. `src/lib/urlUtils.ts` — Cập nhật URL helpers

```ts
export function getProjectUrl(wsShortId: string, projectSlug: string): string {
  return `/pr/ws-${wsShortId}/${projectSlug}`;
}

export function getTaskUrl(wsShortId: string, projectSlug: string, taskSlug: string): string {
  return `/pr/ws-${wsShortId}/${projectSlug}/t/${taskSlug}`;
}

export function getPageUrl(wsShortId: string, pageSlug: string): string {
  return `/pa/ws-${wsShortId}/${pageSlug}`;
}

export function getFilePreviewUrl(wsShortId: string, projectSlug: string, taskSlug: string, fileIndex: number = 0): string {
  return `/pr/ws-${wsShortId}/${projectSlug}/t/${taskSlug}/f/${fileIndex}`;
}
```

### 4. `src/App.tsx` — Cập nhật route definitions

**Routes mới:**
```tsx
{/* Project routes */}
<Route path="/pr/ws-:wsShortId/:projectSlug" element={<GroupDetail />} />
<Route path="/pr/ws-:wsShortId/:projectSlug/t/:taskSlug" element={<GroupDetail />} />
<Route path="/pr/ws-:wsShortId/:projectSlug/t/:taskSlug/f/:fileIndex" element={<FilePreview />} />

{/* Page routes */}
<Route path="/pa/ws-:wsShortId/:pageSlug" element={<GroupDetail />} />
```

**Redirect routes cũ** (giữ backward compatibility):
```tsx
{/* Legacy redirects */}
<Route path="/p/:projectSlug" element={<LegacyProjectRedirect />} />
<Route path="/p/:projectSlug/page/:pageSlug" element={<LegacyPageRedirect />} />
<Route path="/p/:projectSlug/t/:taskSlug" element={<LegacyTaskRedirect />} />
<Route path="/p/:projectSlug/t/:taskSlug/f/:fileIndex" element={<LegacyFileRedirect />} />
<Route path="/groups/:groupId" element={<LegacyGroupRedirect />} />
```

Mỗi redirect component sẽ query DB để tìm workspace short_id rồi `<Navigate>` sang URL mới.

### 5. Cập nhật tất cả navigation calls (~10 files)

Các file cần cập nhật để truyền `wsShortId`:

| File | Thay đổi |
|------|----------|
| `src/pages/Groups.tsx` | Link to → `getProjectUrl(wsShortId, slug)` |
| `src/pages/GroupDetail.tsx` | Parse `wsShortId` từ params, navigate dùng URL mới |
| `src/pages/Communication.tsx` | Navigate dùng `getProjectUrl()` |
| `src/pages/FilePreview.tsx` | Navigate dùng URL mới |
| `src/pages/Dashboard.tsx` | Link to projects dùng URL mới |
| `src/components/TaskCard.tsx` | Nhận thêm `wsShortId` prop |
| `src/components/SidebarTreeNav.tsx` | Build paths dùng `getProjectUrl()` |
| `src/components/canvas/CanvasPageView.tsx` | Navigate page dùng `getPageUrl()` |
| `src/components/dashboard/DashboardProjectCard.tsx` | Link dùng URL mới |
| `src/components/calendar/CalendarTaskDetailDialog.tsx` | Navigate dùng URL mới |
| `src/components/MemberRoleManagementDialog.tsx` | Navigate dùng URL mới |
| `src/components/GroupDashboard.tsx` | Breadcrumb link |
| `src/components/AccessDenied.tsx` | Back button |

### 6. Context / Data flow

- `WorkspaceContext` đã cung cấp `activeWorkspace` → thêm `short_id` vào data flow
- Các component cần workspace short_id sẽ lấy từ `useWorkspace().activeWorkspace?.short_id`
- Khi load project từ URL, parse `wsShortId` từ route params

### Tổng quan files thay đổi

| Loại | Files |
|------|-------|
| Migration | 1 (thêm `short_id` + trigger) |
| URL Utils | `src/lib/urlUtils.ts` |
| Types | `src/types/database.ts` |
| Routing | `src/App.tsx` |
| Pages | `Groups.tsx`, `GroupDetail.tsx`, `Communication.tsx`, `FilePreview.tsx`, `Dashboard.tsx` |
| Components | ~8 components cần cập nhật navigation |

