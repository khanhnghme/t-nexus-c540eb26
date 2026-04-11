

## Plan: Cập nhật bảng màu theo Tailwind Slate palette

### Tổng quan
Cập nhật design tokens trong `src/index.css` để sử dụng bảng màu **Slate** chuẩn từ Figma (F8FAFC → 020617), thay thế palette hiện tại.

### Bảng màu Slate (từ hình Figma)

| Name | Light (hex) | Dark (hex) |
|------|------------|------------|
| 50 | #F8FAFC | #020617 |
| 100 | #F1F5F9 | #0F172A |
| 200 | #E2E8F0 | #1E293B |
| 300 | #CBD5E1 | #334155 |
| 400 | #94A3B8 | #475569 |
| 500 | #64748B | #64748B |
| 600 | #475569 | #94A3B8 |
| 700 | #334155 | #CBD5E1 |
| 800 | #1E293B | #E2E8F0 |
| 900 | #0F172A | #F1F5F9 |
| 950 | #020617 | #F8FAFC |

### Mapping sang CSS variables

| Token | Light (Slate) | Dark (Slate) |
|-------|--------------|-------------|
| `--background` | Slate-50 `210 40% 98%` | Slate-950 `222 84% 5%` |
| `--foreground` | Slate-950 `222 84% 5%` | Slate-50 `210 40% 98%` |
| `--card` | White `0 0% 100%` | Slate-900 `222 47% 11%` |
| `--card-foreground` | Slate-950 | Slate-50 |
| `--muted` | Slate-100 `210 40% 96%` | Slate-800 `217 33% 17%` |
| `--muted-foreground` | Slate-500 `215 16% 47%` | Slate-400 `215 20% 65%` |
| `--accent` | Slate-100 | Slate-800 |
| `--border` | Slate-200 `214 32% 91%` | Slate-800 |
| `--input` | Slate-200 | Slate-800 |
| `--secondary` | Slate-100 | Slate-800 |
| `--popover` | White | Slate-900 |

### File thay đổi

| File | Thay đổi |
|------|----------|
| `src/index.css` | Cập nhật tất cả CSS variables (`:root` và `.dark`) sang Slate palette |

### Giữ nguyên
- Brand colors (UEH teal/orange)
- Landing page tokens
- Primary color (blue)
- Stage colors
- Font settings
- Shadow system

