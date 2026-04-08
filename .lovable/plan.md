

## Redesign Dashboard Layout — CSS Grid 4 Zones

### Tổng quan

Chuyển layout từ `position: fixed sidebar + margin-left content` sang **CSS Grid 2 cột × 2 hàng** với đường border rõ ràng phân chia 4 khu vực:

```text
┌──────────────────┬────────────────────────────────────────────┐
│  [Logo + Toggle] │        TOP BAR (breadcrumb, search, user) │
├──────────────────┼────────────────────────────────────────────┤
│                  │                                            │
│  SIDEBAR NAV     │              MAIN CONTENT                  │
│  (scrollable)    │              (Outlet)                      │
│                  │                                            │
├──────────────────┤                                            │
│  [Upgrade+User]  │                                            │
└──────────────────┴────────────────────────────────────────────┘
```

### Thay đổi chi tiết

#### File 1: `src/components/layout/DashboardLayout.tsx`

**Cấu trúc HTML mới** — thay thế fragment hiện tại bằng một wrapper grid:

```text
<div class="dashboard-grid">
  <!-- Cell 1: Top-left (logo) -->
  <div class="grid-cell-logo">
    Logo + sidebar toggle
  </div>
  
  <!-- Cell 2: Top-right (top bar) -->  
  <div class="grid-cell-topbar">
    Breadcrumb/page title + search + theme toggle + user avatar
  </div>
  
  <!-- Cell 3: Bottom-left (sidebar nav, scrollable) -->
  <div class="grid-cell-sidebar">
    <SidebarTreeNav />
  </div>
  
  <!-- Cell 4: Bottom-left-bottom (user card) — inside sidebar cell -->
  <!-- Sidebar cell uses flex-col: nav scrolls, bottom sticks -->
  
  <!-- Cell 5: Main content -->
  <div class="grid-cell-content">
    <Outlet />
  </div>
</div>
```

**Top Bar nội dung:**
- Bên trái: Breadcrumb động theo route (VD: "Trang chủ", "Dự án", "Cài đặt")
- Bên phải: Theme toggle + User avatar nhỏ (quick menu)

**Sidebar cell** giữ nguyên nội dung hiện có (SidebarTreeNav + UpgradeBox + UserProfile) nhưng bỏ `position: fixed`, dùng grid placement.

**Collapsed state**: Grid column trái co lại từ 252px → 56px, giữ nguyên logic hiện có.

#### File 2: `src/index.css` — CSS Grid thay thế fixed positioning

Thay thế toàn bộ block `.dashboard-sidebar` + `.dashboard-content-area`:

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: 252px 1fr;
  grid-template-rows: 52px 1fr;
  height: 100vh;
  width: 100vw;
  transition: grid-template-columns 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}

.dashboard-grid.sidebar-collapsed {
  grid-template-columns: 56px 1fr;
}

/* Đường border phân chia */
.grid-cell-logo {
  grid-row: 1; grid-column: 1;
  border-right: 1px solid var(--_sb-border-strong);
  border-bottom: 1px solid var(--_sb-border-strong);
}

.grid-cell-topbar {
  grid-row: 1; grid-column: 2;
  border-bottom: 1px solid var(--_sb-border-strong);
}

.grid-cell-sidebar {
  grid-row: 2; grid-column: 1;
  border-right: 1px solid var(--_sb-border-strong);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* Ô nhỏ cuối (user profile) tách bằng border-top bên trong */
}

.grid-cell-content {
  grid-row: 2; grid-column: 2;
  overflow-y: auto;
}
```

**Đường kẻ quan trọng:**
1. **Ngang full-width** (dòng 1 vs dòng 2): `border-bottom` trên logo + topbar cells
2. **Dọc full-height** (cột 1 vs cột 2): `border-right` trên logo + sidebar cells
3. **Ngang riêng sidebar** (nav vs user): `border-top` trên `.sidebar-bottom` (đã có sẵn)

#### File 3: Tạo `src/components/layout/TopBar.tsx`

Component mới cho khu vực top bar:
- Hiển thị page title/breadcrumb dựa trên `location.pathname`
- Bên phải: search hint, theme toggle, user avatar mini
- Đồng bộ style với sidebar tokens

#### Mobile responsive

- Dưới 768px: Grid chuyển thành single column, ẩn sidebar, giữ mobile topbar + drawer hiện có
- Top bar desktop ẩn trên mobile, mobile topbar hiện

### Không thay đổi
- Logic sidebar collapsed/expanded (giữ nguyên)
- SidebarTreeNav, UpgradeBox, UserProfile (giữ nguyên nội dung)
- Routing, contexts, dialogs (giữ nguyên)

