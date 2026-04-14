

## Plan: Fix mobile navigation cho điện thoại

### Vấn đề phát hiện

Trên mobile (<768px), CSS hiện tại ẩn hoàn toàn `grid-cell-topbar` (chứa project tab navigation) và `grid-cell-logo`. Khi vào dự án, user không thể chuyển giữa các tab (Overview, Tasks, Members...) vì thanh tabs bị ẩn.

---

### Giải pháp: 3 thay đổi

#### 1. Hiển thị project tabs trên mobile dưới dạng thanh cuộn ngang

**File:** `src/index.css` (lines 1900-1903)

Thay vì ẩn `grid-cell-topbar` trên mobile, chỉ ẩn khi KHÔNG ở trong project. Khi ở project page, hiển thị topbar ngay dưới mobile top bar với scroll ngang cho các tabs.

- Bỏ `display: none` cho `grid-cell-topbar` trên mobile
- Thêm style cho topbar mobile: fixed position dưới mobile top bar (top: 48px), full width, scroll ngang
- Topbar chỉ hiện khi có project nav (class điều kiện từ JS)

#### 2. Cập nhật DashboardLayout để thêm class nhận biết project mode trên mobile

**File:** `src/components/layout/DashboardLayout.tsx`

- Thêm class `has-project-nav` vào `dashboard-grid` khi `projectNavProps` tồn tại
- Cập nhật `grid-cell-content` padding-top khi có project nav bar (48px topbar + 44px tabs = 92px)

#### 3. Cải thiện mobile top bar — thêm nút back + tên project khi đang ở trong dự án

**File:** `src/components/layout/DashboardLayout.tsx`

- Khi đang ở project (có `projectNavProps`), mobile top bar hiển thị: nút Back + tên project (thay vì logo)
- Giữ hamburger menu cho các trang khác

#### 4. CSS responsive cho project tabs trên mobile

**File:** `src/index.css`

```css
@media (max-width: 767px) {
  /* Khi có project nav, hiện topbar dưới dạng sticky bar */
  .dashboard-grid.has-project-nav .grid-cell-topbar {
    display: flex;
    position: fixed;
    top: 48px; /* dưới mobile topbar */
    left: 0;
    right: 0;
    z-index: 40;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    height: 44px;
  }
  
  /* Tăng padding-top content khi có project nav */
  .dashboard-grid.has-project-nav .grid-cell-content {
    padding-top: 96px; /* 48 + 44 + 4 */
  }
  
  /* Ẩn phần không cần thiết trên mobile topbar */
  .dashboard-grid.has-project-nav .grid-cell-topbar .topbar-logo,
  .dashboard-grid.has-project-nav .grid-cell-topbar .topbar-theme-toggle {
    display: none;
  }
}
```

---

### Tổng kết

| # | Thay đổi | File |
|---|----------|------|
| 1 | CSS mobile cho project tabs | `src/index.css` |
| 2 | Thêm class `has-project-nav` | `src/components/layout/DashboardLayout.tsx` |
| 3 | Mobile topbar hiện back + tên project | `src/components/layout/DashboardLayout.tsx` |
| 4 | TopBar ẩn elements thừa trên mobile | `src/components/layout/TopBar.tsx` |

**Tổng: 3 files. Không thêm dependencies. Backward compatible.**

