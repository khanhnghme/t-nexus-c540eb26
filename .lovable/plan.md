

## Plan: Upgrade shadcn/ui Components lên Style v4 New-York (Tailwind v3 compatible)

### Nguyên tắc

Lấy style mới nhất từ shadcn/ui v4 (new-york) nhưng giữ nguyên:
- `forwardRef` pattern (vì project dùng React 18, không phải React 19)
- Import từ `@radix-ui/*` (vì project chưa dùng unified `radix-ui` package)
- Tailwind v3 syntax (thay `shadow-xs` → `shadow-sm`, thay `ring-[3px]` → `ring-2`, etc.)
- Giữ custom tokens đã có (shadow-dropdown, duration-fast, etc.)

### Batch 1: Core Primitives (8 files)

| File | Thay đổi chính |
|------|----------------|
| `button.tsx` | Thêm size `xs`, `icon-xs`, `icon-sm`, `icon-lg`; cập nhật focus ring sang `ring-ring/50`; thêm `aria-invalid` styles; dark mode refinements cho destructive/outline/ghost |
| `badge.tsx` | Thêm variant `ghost` + `link`; hỗ trợ `asChild` prop; cập nhật focus ring; thêm `[a&]:hover` pattern |
| `input.tsx` | Thêm `aria-invalid:border-destructive aria-invalid:ring-destructive/20`; dark mode input styles |
| `checkbox.tsx` | Cập nhật focus ring, thêm `aria-invalid` support, transition cho check icon |
| `switch.tsx` | Thêm `size` prop (`sm` / `default`); cập nhật focus ring |
| `select.tsx` | Thêm `size` prop cho trigger (`sm` / `default`); chuẩn hóa focus ring |
| `tabs.tsx` | Thêm `variant` prop cho TabsList (`default` / `line`); hỗ trợ `orientation` prop |
| `card.tsx` | Thêm `CardAction` component; cập nhật layout dùng grid cho header; thêm `data-slot` |

### Batch 2: Overlay & Feedback (5 files)

| File | Thay đổi chính |
|------|----------------|
| `dialog.tsx` | Thêm `showCloseButton` prop; cập nhật overlay + content classes theo v4 |
| `sheet.tsx` | Cập nhật overlay style; chuẩn hóa close button |
| `tooltip.tsx` | Cập nhật sang arrow-based tooltip (v4 pattern); `sideOffset=0` default |
| `alert.tsx` | Chuyển sang grid layout (`grid-cols-[0_1fr]`); cải thiện icon alignment |
| `drawer.tsx` | Cập nhật handle + overlay styles |

### Batch 3: Navigation & Layout (4 files)

| File | Thay đổi chính |
|------|----------------|
| `accordion.tsx` | Bỏ `hover:underline` default trên trigger; cập nhật padding |
| `popover.tsx` | Cập nhật shadow + animation timing |
| `separator.tsx` | Cập nhật classes cho consistency |
| `scroll-area.tsx` | Scrollbar thon hơn |

### Tổng: 17 files sửa

Chỉ thay đổi styling classes + thêm props/variants mới. Hoàn toàn backward compatible — tất cả code cũ dùng component vẫn hoạt động bình thường.

### Rủi ro
- **Thấp** — giữ nguyên API cũ, chỉ thêm props mới
- Cần verify dark mode sau khi update

