
## Plan: Redesign Workspace Switcher theo mẫu tham khảo

### Mô tả
Redesign dropdown workspace switcher trong sidebar theo layout giống ảnh đính kèm: hiện card thông tin workspace đang active (tên, plan, số member) với 2 link nhanh (Settings, Invite members), rồi danh sách tất cả workspaces bên dưới. Bỏ phần Credits UI. Đồng thời di chuyển Overview → Settings và Members → Invite members vào trong dropdown, xóa khỏi sidebar nav.

### Thay đổi chi tiết

#### 1. Redesign `WorkspaceSwitcherCell` trong `DashboardLayout.tsx`
Dropdown content mới gồm 3 phần:

**Phần 1 — Active workspace info card:**
- Avatar tròn lớn + tên workspace
- Dòng phụ: `{planLabel} · {memberCount} member(s)`
- 2 nút action: ⚙️ Settings → `/workspace/settings`, 👥 Invite members → `/workspace/members`

**Phần 2 — Separator + "All workspaces" label**
- Danh sách workspaces với avatar, tên, badge plan (PRO/FREE), checkmark cho active

**Phần 3 — "+ Create new workspace"**

Bỏ hoàn toàn phần Credits UI (không có trong hệ thống này).

Cần thêm query nhẹ đếm member count cho active workspace (dùng `workspace_members` count + 1 cho owner).

#### 2. Xóa Overview & Members khỏi `SidebarTreeNav.tsx`
- Xóa link `/workspace/settings` (Overview) và `/workspace/members` (Members) khỏi cả collapsed và expanded mode
- Giữ nguyên AI Assistant và các mục khác

#### 3. Cập nhật collapsed dropdown
Collapsed mode cũng hiển thị tương tự nhưng mở sang bên phải, có đầy đủ info card.

### Files thay đổi

| # | File | Thay đổi |
|---|------|----------|
| 1 | `src/components/layout/DashboardLayout.tsx` | Redesign `WorkspaceSwitcherCell` dropdown content |
| 2 | `src/components/SidebarTreeNav.tsx` | Xóa 2 nav items (Overview, Members) |

**2 files. Không thêm dependencies.**
