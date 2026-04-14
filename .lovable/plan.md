

## Phase 1: Chuẩn hóa Design Tokens — Chi tiết triển khai

### Hiện trạng đã kiểm tra

**`tailwind.config.ts`:**
- Colors: đầy đủ (primary, secondary, destructive, success, warning, info, stage, sidebar)
- Border-radius: 5 cấp (sm, md, lg, xl, 2xl) dựa trên `--radius`
- Fonts: `sans` (NotionInter) + `heading` (Be Vietnam Pro)
- Shadows: chỉ có 2 (`card`, `card-lg`)
- Spacing: chưa mở rộng (dùng mặc định Tailwind)
- Typography scale: chưa có (dùng mặc định `text-sm`, `text-lg`...)
- Transition tokens: chưa có

**`src/index.css`:**
- 4 theme variants: `:root` (light), `.dark`, `html.google-mode`, `html.google-mode.dark`
- Đã có shadow tokens: `--notion-shadow-popup`, `--notion-shadow-card`, `--shadow-sm/md/lg/xl`
- Đã có typography tokens: `--font-heading`, `--font-primary`
- `--radius`: `0.375rem` (default) / `0.5rem` (google-mode)

---

### Thay đổi cụ thể

#### 1. `tailwind.config.ts` — Mở rộng theme tokens

**a) Spacing scale bổ sung:**
```ts
spacing: {
  '4.5': '1.125rem',   // 18px — giữa p-4 và p-5
  '13': '3.25rem',      // 52px — hero padding
  '15': '3.75rem',      // 60px — section gap
  '18': '4.5rem',       // 72px — page margin lớn
}
```

**b) Typography scale (fontSize) có line-height + tracking:**
```ts
fontSize: {
  '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
  'heading-1': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em', fontWeight: '700' }],
  'heading-2': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em', fontWeight: '600' }],
  'heading-3': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em', fontWeight: '600' }],
  'heading-4': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
  'body': ['0.875rem', { lineHeight: '1.375rem' }],
  'body-sm': ['0.8125rem', { lineHeight: '1.25rem' }],
  'caption': ['0.75rem', { lineHeight: '1rem' }],
}
```

**c) Border-radius thêm `3xl`:**
```ts
borderRadius: {
  // ...giữ nguyên sm, md, lg, xl, 2xl
  '3xl': 'calc(var(--radius) + 12px)',
}
```

**d) Box shadow mở rộng:**
```ts
boxShadow: {
  'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  'card-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  'elevated': '0 4px 12px -2px rgb(0 0 0 / 0.08), 0 0 0 1px rgb(0 0 0 / 0.04)',
  'dropdown': 'var(--notion-shadow-popup)',
  'modal': '0 24px 48px -12px rgb(0 0 0 / 0.18), 0 0 0 1px rgb(0 0 0 / 0.05)',
  'button': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  'inset': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.06)',
}
```

**e) Transition tokens:**
```ts
transitionDuration: {
  'micro': '100ms',
  'fast': '150ms',
  'normal': '200ms',
  'smooth': '300ms',
  'slow': '500ms',
}
transitionTimingFunction: {
  'ease-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  'ease-smooth': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
}
```

#### 2. `src/index.css` — Thêm spacing custom properties

Thêm vào `:root` (sau `--radius`):
```css
/* Layout spacing tokens */
--space-page: 1.5rem;        /* padding trang */
--space-section: 1.25rem;    /* gap giữa các section */
--space-element: 0.75rem;    /* gap giữa các element trong section */
--space-inline: 0.5rem;      /* gap giữa icon và text */
```

Thêm vào `.dark`:
```css
/* Dark mode shadows override */
--shadow-elevated: 0 4px 12px -2px rgb(0 0 0 / 0.3), 0 0 0 1px rgb(255 255 255 / 0.06);
--shadow-modal: 0 24px 48px -12px rgb(0 0 0 / 0.5), 0 0 0 1px rgb(255 255 255 / 0.05);
```

---

### Files thay đổi

| File | Loại thay đổi |
|------|---------------|
| `tailwind.config.ts` | Thêm spacing, fontSize, borderRadius, boxShadow, transitionDuration, transitionTimingFunction |
| `src/index.css` | Thêm `--space-*` tokens vào `:root` và dark shadow overrides vào `.dark` |

### Rủi ro
- **Rất thấp** — chỉ thêm tokens mới, không sửa/xóa tokens cũ
- Tất cả class hiện tại (`text-sm`, `p-4`, `rounded-xl`...) vẫn hoạt động bình thường
- Các tokens mới chỉ có hiệu lực khi được sử dụng trong code (Phase 4)

