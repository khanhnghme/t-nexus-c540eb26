

## Tích hợp Project Navigation vào TopBar & Fix màu nền

### Vấn đề hiện tại
1. TopBar có nền dark (`#0f0f11`) trong dark mode nhưng không đồng bộ với sidebar trong light mode
2. Trang Project có 2 lớp điều hướng: TopBar (breadcrumb) + ProjectNavigation (tabs riêng trong content area) — gây rối UX

### Thay đổi

#### 1. Fix màu nền TopBar (index.css)
- Light mode: đổi `.grid-cell-topbar` background thành `var(--_sb-bg)` (giống sidebar) thay vì `hsl(var(--background))`
- Thêm `backdrop-filter: blur(16px) saturate(1.6)` cho đồng bộ với sidebar

#### 2. TopBar hiển thị Project tabs khi ở trang Project (TopBar.tsx)
- Detect route `/group/:slug` hoặc `/project/:slug` → chế độ "project mode"
- Khi ở project mode: thay breadcrumb bằng dãy tab ngang (Tổng quan, Task, Họp nhóm, Tài nguyên, Thành viên, Điểm, Nhật ký, Cài đặt)
- Tabs sử dụng style nhỏ gọn phù hợp topbar height (52px): icon + text, không wrap
- Active tab highlight bằng `bg-primary text-primary-foreground` giống style cũ nhưng compact hơn
- Giữ nút theme toggle bên phải

#### 3. Truyền project context lên TopBar
- TopBar cần biết: `activeTab`, `onTabChange`, `isLeaderInGroup`, `isGroupCreator`, `membersCount`, `hasActiveMeeting`, `isScoreFinalized`
- Sử dụng `DashboardLayoutContext` mở rộng thêm `projectNavProps` (optional object)
- GroupDetail.tsx gọi `setProjectNavProps({...})` trong useEffect khi mount, clear khi unmount
- TopBar đọc `projectNavProps` từ context → render tabs nếu có

#### 4. Xóa ProjectNavigation khỏi GroupDetail.tsx
- Bỏ `<ProjectNavigation ... />` và wrapper div khỏi return JSX
- Giữ nguyên `<Tabs>` logic bên dưới (vẫn dùng hidden TabsList)

### Files thay đổi
1. **src/index.css** — fix background `.grid-cell-topbar`
2. **src/contexts/DashboardLayoutContext.tsx** — thêm `projectNavProps` state
3. **src/components/layout/TopBar.tsx** — render project tabs khi có context
4. **src/pages/GroupDetail.tsx** — set context on mount, remove `<ProjectNavigation />`
5. **src/components/ProjectNavigation.tsx** — giữ file nhưng không import ở GroupDetail nữa

