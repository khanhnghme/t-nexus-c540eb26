

## Plan: Admin sidebar thay thế sidebar chính

### Vấn đề
Hiện tại khi vào `/admin/*`, sidebar chính (SidebarTreeNav) vẫn hiển thị, và AdminLayout render thêm một sidebar phụ bên cạnh → tạo 2 sidebar song song, chiếm nhiều không gian.

### Giải pháp
Khi route bắt đầu bằng `/admin`, **thay thế** nội dung sidebar chính bằng menu admin (nút quay lại + danh sách admin items). Không cần AdminLayout riêng nữa.

### Thay đổi

**1. `DashboardLayout.tsx` — phát hiện route admin, đổi sidebar**
- Kiểm tra `location.pathname.startsWith('/admin')`
- Nếu đúng: thay `SidebarTreeNav` bằng component `AdminSidebarNav` (nút "← Back", tiêu đề ADMIN, 4 mục con)
- Ẩn luôn phần bottom (UpgradeBox + user profile) hoặc giữ user profile tuỳ ý — giữ user profile cho nhất quán

**2. `AdminLayout.tsx` — đơn giản hóa**
- Xóa toàn bộ secondary sidebar
- Chỉ giữ lại: kiểm tra `isAdmin` → redirect nếu không phải admin, redirect `/admin` → `/admin/members`, và render `<Outlet />`
- Không render sidebar riêng nữa

**3. `SidebarTreeNav.tsx` — tạo variant admin**
- Hoặc tách ra component `AdminSidebarNav.tsx` mới, hoặc thêm logic vào trong `SidebarTreeNav`
- Gồm: nút ArrowLeft "Back to Home", tiêu đề "ADMIN", 4 link (Members, Backup, System, Utilities)
- Hỗ trợ cả collapsed mode (chỉ icon + tooltip)

**4. CSS — dọn dẹp**
- Xóa styles `.admin-secondary-sidebar`, `.admin-content-area` trong `index.css`
- Tái sử dụng các class sidebar hiện có (`.sidebar-nav-item`, `.nav-icon`, v.v.)

### Flow mới

```text
/dashboard:
  [Logo] [TopBar        ]
  [SidebarTreeNav] [Content]

/admin/members:
  [Logo] [TopBar        ]
  [← Back       ] [Content]
  [ADMIN        ]
  [Members  ●   ]
  [Backup       ]
  [System       ]
  [Utilities    ]
  [User profile ]
```

### Files
| File | Thay đổi |
|------|----------|
| `src/components/layout/DashboardLayout.tsx` | Phát hiện `/admin` route, render `AdminSidebarNav` thay cho `SidebarTreeNav` |
| `src/components/layout/AdminLayout.tsx` | Xóa sidebar, chỉ giữ guard + redirect + `<Outlet />` |
| `src/components/AdminSidebarNav.tsx` | **Mới** — menu admin cho sidebar chính |
| `src/index.css` | Xóa `.admin-secondary-sidebar` styles, thêm styles nhỏ cho admin nav |

