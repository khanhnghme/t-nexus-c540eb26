

## Phase 4: Audit & Polish UI Components — Chi tiết triển khai

### Hiện trạng đã kiểm tra

**Các vấn đề phát hiện:**

| Component | Vấn đề |
|-----------|--------|
| `input.tsx` | Thiếu transition cho border/shadow khi focus |
| `textarea.tsx` | Thiếu transition tương tự input |
| `select.tsx` | `rounded-[4px]` trigger — không dùng token, thiếu transition |
| `badge.tsx` | Chưa có variant `dot`, thiếu transition |
| `skeleton.tsx` | Dùng `animate-pulse` cơ bản, chưa dùng `skeleton-wave` từ Phase 2 |
| `tabs.tsx` | Focus ring dùng `ring-ring` thay vì `ring-primary/30`, thiếu transition trên trigger |
| `tooltip.tsx` | Shadow hardcode dài, animation cơ bản |
| `dropdown-menu.tsx` | Shadow hardcode giống tooltip, animation timing mặc định |
| `table.tsx` | Hover hardcode `rgba(55,53,47,0.04)`, thiếu sticky header |
| `DashboardProjectCard.tsx` | Transition inline, chưa dùng `hover-lift` |
| `TaskCard.tsx` | Dùng `hover:shadow-card-lg` nhưng chưa có press effect |
| `KanbanBoard.tsx` | Thiếu animation khi drag |

---

### Batch 1: UI Primitives (8 files)

#### 1. `input.tsx` — Thêm transition
```diff
- "flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background ... focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary ..."
+ "flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-[border-color,box-shadow] duration-fast ... focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary ..."
```

#### 2. `textarea.tsx` — Tương tự input
Thêm `transition-[border-color,box-shadow] duration-fast`

#### 3. `select.tsx` — Chuẩn hóa radius + transition
- `SelectTrigger`: đổi `rounded-[4px]` → `rounded-md`, thêm `transition-[border-color,box-shadow] duration-fast`
- `SelectContent`: thay shadow hardcode → `shadow-dropdown`, thêm `duration-fast` cho animation
- `SelectItem`: đổi `duration-[20ms]` → `duration-micro`

#### 4. `badge.tsx` — Thêm variant `dot` + transition
```ts
variant: {
  // ...giữ nguyên default, secondary, destructive, outline
  dot: "border-transparent bg-transparent text-foreground pl-4 relative before:absolute before:left-1.5 before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-current",
}
```
Thêm `transition-colors duration-fast` vào base class.

#### 5. `skeleton.tsx` — Chuyển sang skeleton-wave
```diff
- "animate-pulse rounded-md bg-muted"
+ "rounded-md bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:200%_100%] animate-skeleton-wave"
```

#### 6. `tabs.tsx` — Cải thiện transition + focus ring
- `TabsTrigger`: thêm `duration-fast` vào `transition-all`, đổi focus ring thành `focus-visible:ring-2 focus-visible:ring-primary/30`
- `TabsContent`: đổi `focus-visible:ring-ring` → `focus-visible:ring-primary/30`

#### 7. `tooltip.tsx` — Shadow token + faster animation
- `TooltipContent`: thay shadow hardcode → `shadow-dropdown`, thêm `duration-fast` vào animation

#### 8. `dropdown-menu.tsx` — Shadow token + timing
- `DropdownMenuContent`: thay shadow hardcode → `shadow-dropdown`, thêm `duration-fast`
- `DropdownMenuItem`: đổi `duration-[20ms]` → `duration-micro`
- `DropdownMenuSubContent`: thay shadow → `shadow-dropdown`

---

### Batch 2: Page Components (5 files)

#### 9. `DashboardProjectCard.tsx`
- Wrapper: thêm class `hover-lift` (từ Phase 2), bỏ inline `hover:shadow-md`
- Image: giữ nguyên `group-hover:scale-105`

#### 10. `TaskCard.tsx`
- Card wrapper: thêm `press-effect` class, giữ `hover:shadow-card-lg`

#### 11. `KanbanBoard.tsx`
- Draggable card: thêm `transition-transform duration-fast` khi không drag
- `isDragging`: thêm `shadow-elevated scale-[1.02] rotate-[1deg]` thay vì chỉ `opacity-70`

#### 12. `table.tsx`
- `TableRow`: đổi `hover:bg-[rgba(55,53,47,0.04)]` → `hover:bg-accent/50`, đổi `duration-[20ms]` → `duration-micro`
- `TableHead`: thêm `sticky top-0 bg-background/95 backdrop-blur-sm z-10` (sticky header)

#### 13. `DashboardLayout.tsx`
- Sidebar toggle: đảm bảo `transition-[width] duration-smooth` (kiểm tra CSS class `dashboard-grid` trong `index.css`)

---

### Files thay đổi tổng hợp

| File | Thay đổi |
|------|----------|
| `src/components/ui/input.tsx` | +transition |
| `src/components/ui/textarea.tsx` | +transition |
| `src/components/ui/select.tsx` | Chuẩn hóa radius, shadow token, transition |
| `src/components/ui/badge.tsx` | +variant `dot`, +transition |
| `src/components/ui/skeleton.tsx` | skeleton-wave animation |
| `src/components/ui/tabs.tsx` | +transition, focus ring chuẩn hóa |
| `src/components/ui/tooltip.tsx` | Shadow token, faster animation |
| `src/components/ui/dropdown-menu.tsx` | Shadow token, timing chuẩn hóa |
| `src/components/ui/table.tsx` | Hover token, sticky header |
| `src/components/dashboard/DashboardProjectCard.tsx` | +hover-lift |
| `src/components/TaskCard.tsx` | +press-effect |
| `src/components/KanbanBoard.tsx` | Drag animation cải thiện |
| `src/components/layout/DashboardLayout.tsx` | Sidebar transition (kiểm tra) |

**Tổng: 13 files** — chỉ thay đổi CSS classes, không sửa logic.

### Rủi ro
- **Thấp** — tất cả đều là thay đổi styling, không chạm business logic
- Sticky header trên `table.tsx` có thể cần kiểm tra trong các trang có table scroll
- `skeleton-wave` cần verify gradient hiển thị đúng trên cả light/dark mode

