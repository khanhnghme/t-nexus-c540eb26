

## Plan: Tách 3 filter projects thành 3 route URL riêng

### Thay đổi

#### 1. `src/App.tsx` — Thêm 2 route mới
```
/groups          → All projects (giữ nguyên)
/groups/created  → Created by me
/groups/shared   → Shared with me
```

#### 2. `src/components/SidebarTreeNav.tsx` — Đổi href
- `/groups?filter=all` → `/groups`
- `/groups?filter=created` → `/groups/created`
- `/groups?filter=shared` → `/groups/shared`
- Đổi `isProjectFilterActive` để match theo pathname thay vì query param

#### 3. `src/pages/Groups.tsx` — Đọc filter từ route thay vì query param
- Thêm nhận `useParams` hoặc dùng `useLocation().pathname` để xác định filter:
  - `/groups` hoặc `/groups/` → `all`
  - `/groups/created` → `created`
  - `/groups/shared` → `shared`
- Xóa `useSearchParams` logic
- Đổi tab navigation từ `setSearchParams` sang `navigate('/groups/created')` etc.

### Files thay đổi

| # | File | Thay đổi |
|---|------|----------|
| 1 | `App.tsx` | Thêm route `/groups/created` và `/groups/shared` |
| 2 | `SidebarTreeNav.tsx` | Đổi href sang pathname-based |
| 3 | `Groups.tsx` | Đọc filter từ pathname, đổi tab navigation |

**3 files. Không thêm dependencies.**

