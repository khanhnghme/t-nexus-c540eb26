

## Plan: Redesign Dashboard theo phong cách Notion tối giản

### Phân tích hiện trạng

Dashboard hiện tại có:
- **Welcome section** lớn (avatar, stats, badges, invitations) chiếm nhiều diện tích
- **Project grid** với bộ lọc phức tạp (Active/Hidden/Pending + Basic/Custom)
- **Sidebar** theo cấu trúc workspace-centric (workspace switcher, Overview, Members...)
- Chưa có hệ thống **Starred** hoặc **Recent** projects

### Thay đổi tổng thể

```text
┌──────────────┬──────────────────────────────────────┐
│  Sidebar     │  Main Content                        │
│              │                                      │
│ 🏠 Home      │  ┌─ Quick Actions ────────────────┐  │
│ ⭐ Starred   │  │ Search · Join · Invitations     │  │
│ 🕑 Recent    │  └────────────────────────────────-┘  │
│ ─────────    │                                      │
│ 📂 All       │  ┌─ Section (based on sidebar) ───┐  │
│ 👤 Owned     │  │                                 │  │
│ 🤝 Shared    │  │  Project cards grid             │  │
│ ─────────    │  │                                 │  │
│ + New Project│  └─────────────────────────────────┘  │
│              │                                      │
│ ─── Admin ── │                                      │
│ 🛡️ Admin     │                                      │
└──────────────┴──────────────────────────────────────┘
```

---

### Chi tiết từng thay đổi

#### 1. Database: Thêm bảng `starred_projects` + `project_access_log`

```sql
-- Starred projects
CREATE TABLE public.starred_projects (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);
ALTER TABLE public.starred_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own stars"
  ON public.starred_projects FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Recent access tracking
CREATE TABLE public.project_access_log (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  accessed_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);
ALTER TABLE public.project_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own access log"
  ON public.project_access_log FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

#### 2. Sidebar: Thay thế navigation items trong `SidebarTreeNav.tsx`

Thay toàn bộ workspace section bằng cấu trúc Notion-style:

| Mục | Icon | Hành vi |
|-----|------|---------|
| Home | 🏠 | `/dashboard` — trang chính, hiển thị recent + starred |
| Starred | ⭐ | `/dashboard?view=starred` — chỉ hiện project đã đánh dấu sao |
| Recent | 🕑 | `/dashboard?view=recent` — 10 project truy cập gần nhất |
| --- separator --- | | |
| All Projects | 📂 | `/dashboard?view=all` hoặc `/groups` |
| Owned by Me | 👤 | `/dashboard?view=owned` — project user tạo ra |
| Shared with Me | 🤝 | `/dashboard?view=shared` — project user được mời vào |
| --- separator --- | | |
| + New Project | ➕ | Mở dialog tạo project mới |

Giữ lại phía dưới: Calendar, Communication, Account, Admin (không đổi).

**Interaction:**
- Hover: highlight nhẹ bg
- Click: chuyển view, sidebar item active
- Collapsed mode: chỉ hiện icon với tooltip

#### 3. Dashboard content: Đơn giản hóa `Dashboard.tsx`

**Bỏ:**
- Welcome section lớn (avatar, stats, badges) → thu gọn thành greeting 1 dòng
- Bộ lọc phức tạp (ToggleGroup Active/Hidden/All + Basic/Custom)

**Thay bằng:**
- **Greeting line:** "Good morning, {name}" nhỏ gọn
- **Quick actions bar:** Search input + Join button + Invitation badge
- **Content section:** Thay đổi theo `view` param từ sidebar:
  - `home`: Hiện "Starred" (nếu có) + "Recent" (10 gần nhất)
  - `starred`: Chỉ hiện starred projects
  - `recent`: 10 project gần nhất theo `project_access_log`
  - `all`: Tất cả project (giữ filter Basic/Custom dạng nhỏ)
  - `owned`: Lọc `created_by = user.id`
  - `shared`: Lọc project user được invite/join (không phải owner)

**Project cards:** Giữ nguyên `DashboardProjectCard` hiện tại (đã Notion-style). Thêm nút star (⭐) khi hover.

#### 4. Hook mới: `useProjectViews.ts`

Hook quản lý logic cho các view khác nhau:
- Fetch starred projects từ `starred_projects`
- Fetch recent từ `project_access_log` (top 10, order by accessed_at desc)
- Toggle star (insert/delete `starred_projects`)
- Log access (upsert `project_access_log` khi user mở project)

#### 5. Ghi nhận Recent: Tự động log khi vào project

Trong `GroupDetail.tsx` hoặc layout project, upsert vào `project_access_log` khi mount.

#### 6. Giữ nguyên workspace logic phía backend

Workspace vẫn hoạt động bình thường ở backend. Chỉ ẩn khỏi UI sidebar. Workspace switcher vẫn có thể truy cập từ Account Settings nếu cần.

---

### Tổng kết files

| # | File | Thay đổi |
|---|------|----------|
| 1 | Migration SQL | Tạo `starred_projects` + `project_access_log` + RLS |
| 2 | `src/hooks/useProjectViews.ts` | Hook mới: starred, recent, toggle, log access |
| 3 | `src/components/SidebarTreeNav.tsx` | Thay workspace nav bằng Notion-style items |
| 4 | `src/pages/Dashboard.tsx` | Đơn giản hóa: bỏ welcome section, thêm view-based content |
| 5 | `src/components/dashboard/DashboardProjectCard.tsx` | Thêm star toggle button |
| 6 | `src/pages/GroupDetail.tsx` | Thêm upsert access log khi mount |

**Không thay đổi:** Backend workspace logic, DashboardLayout, TopBar, các trang khác.

