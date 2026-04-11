

## Sửa URL: Quay lại cấu trúc 1 slug, bỏ workspace slug khỏi URL

### Vấn đề

Bạn muốn URL dạng `/p/{project-slug}/page/{page-slug}` (1 cấp) giống như dự án custom, nhưng code hiện tại đang tạo URL dạng `/p/{workspace-slug}/{project-slug}/page/{page-slug}` (2 cấp) — thừa và rối.

### Giải pháp

Quay lại cấu trúc URL 1 slug: `/p/{project-slug}`, đảm bảo project slug **đã unique toàn hệ thống** (database trigger `set_group_slug` đã xử lý điều này).

#### 1. `src/App.tsx` — Xóa routes 2 cấp workspace

- Xóa các route `/p/:workspaceSlug/:projectSlug/...`
- Giữ lại routes gốc: `/p/:projectSlug`, `/p/:projectSlug/page/:pageSlug`, `/p/:projectSlug/t/:taskSlug`, v.v.

#### 2. `src/pages/GroupDetail.tsx` — Bỏ logic resolve workspace slug

- Xóa `workspaceSlug` khỏi `useParams`
- Xóa logic redirect từ URL cũ sang URL mới có workspace
- Giữ logic resolve project bằng `projectSlug` đơn giản

#### 3. `src/lib/urlUtils.ts` — Đơn giản hóa các hàm URL

- `getProjectUrl()` → luôn trả về `/p/{projectSlug}` (bỏ tham số `workspaceSlug`)
- `getTaskUrl()` → `/p/{projectSlug}/t/{taskSlug}`
- `getCanvasPageUrl()` → `/p/{projectSlug}/page/{pageSlug}`
- `getFilePreviewUrl()` → `/p/{projectSlug}/t/{taskSlug}/f/{fileIndex}`

#### 4. Các component sử dụng URL — Bỏ truyền workspace slug

- `SidebarTreeNav.tsx`: bỏ `activeWorkspace?.slug` khỏi link
- `DashboardProjectCard.tsx`: bỏ workspace slug khỏi project link
- `TaskCard.tsx`: bỏ workspace slug khỏi task link
- `Groups.tsx`: bỏ workspace slug khỏi project card link
- `Communication.tsx`: bỏ workspace slug khỏi navigation
- `CanvasPageView.tsx`: bỏ `workspaceSlug` prop

#### 5. Migration SQL — Fix workspace slug cho đẹp (vẫn cần)

Dù URL không dùng workspace slug nữa, vẫn nên fix hàm `generate_workspace_slug` để hỗ trợ tiếng Việt cho các nơi khác hiển thị tên workspace (settings, sidebar...).

### Kết quả URL

| Trước (rối) | Sau (sạch) |
|---|---|
| `/p/ws-286a93a2-0/khanhnghme-s-project-3` | `/p/khanhnghme-s-project-3` |
| `/p/ws-286a93a2-0/khanhnghme-s-project-3/page/trang-2` | `/p/khanhnghme-s-project-3/page/trang-2` |
| `/p/ws-286a93a2-0/khanhnghme-s-project-3/t/task-1` | `/p/khanhnghme-s-project-3/t/task-1` |

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/App.tsx` | Xóa routes 2 cấp workspace |
| `src/pages/GroupDetail.tsx` | Bỏ workspace slug logic |
| `src/lib/urlUtils.ts` | Đơn giản hóa URL functions |
| `src/components/SidebarTreeNav.tsx` | Bỏ workspace slug khỏi links |
| `src/components/dashboard/DashboardProjectCard.tsx` | Bỏ workspace slug |
| `src/components/TaskCard.tsx` | Bỏ workspace slug |
| `src/pages/Groups.tsx` | Bỏ workspace slug |
| `src/pages/Communication.tsx` | Bỏ workspace slug |
| `src/components/canvas/CanvasPageView.tsx` | Bỏ workspaceSlug prop |
| Migration SQL | Fix `generate_workspace_slug` hỗ trợ tiếng Việt |

