

## Redesign thanh TopBar dự án — từ box tabs sang flat inline tabs

### Hiện trạng

Thanh TopBar hiện tại sử dụng các tab dạng **box/pill** (`bg-primary`, `rounded-lg`, `shadow-sm`) trông nặng nề, chiếm nhiều không gian thị giác. Giống kiểu button group hơn là navigation.

### Hướng redesign — Flat underline tabs (kiểu Notion/Linear)

Chuyển sang kiểu tab phẳng, nhẹ, chuyên nghiệp hơn:

```text
  ┌─────────────────────────────────────────────────────────┐
  │  Overview   Tasks   Meetings   Resources   Members  ... │
  │  ─────────                                              │
  └─────────────────────────────────────────────────────────┘
```

- Tab active: text đậm + underline (border-bottom 2px primary) — không có background box
- Tab inactive: text muted, hover nhẹ
- Icon nhỏ hơn hoặc ẩn icon, chỉ hiện text — gọn hơn
- Khoảng cách giữa các tab thoáng hơn (`gap-6`)
- Bỏ `rounded-lg`, `shadow-sm`, `bg-primary` khỏi tab active

### File thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/layout/TopBar.tsx` | Thay style tab từ box/pill sang flat underline. Bỏ background trên active tab, thêm border-bottom indicator. Giảm kích thước icon hoặc ẩn trên desktop |
| `src/components/ProjectNavigation.tsx` | Áp dụng cùng style mới (component này vẫn được dùng ở một số nơi) |

### Chi tiết style mới cho tab

**Active tab:**
- `text-foreground font-semibold` 
- Underline indicator: `after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:rounded-full`
- Không background, không shadow

**Inactive tab:**
- `text-muted-foreground hover:text-foreground`
- Không background khi hover (chỉ đổi màu text)

**Container:**
- Bỏ `bg-background/60 backdrop-blur border rounded-2xl shadow` wrapper
- Tabs nằm trực tiếp trên TopBar, căn giữa, `gap-1` hoặc `gap-6`

