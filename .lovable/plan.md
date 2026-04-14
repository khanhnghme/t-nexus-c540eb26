

## Phase 2: Nâng cấp Animation System — Chi tiết triển khai

### Hiện trạng đã kiểm tra

**`tailwind.config.ts` — Keyframes hiện có:**
- `accordion-down/up`, `fade-in`, `fade-in-up/down/left/right`, `slide-in`, `scale-in`, `scale-in-bounce`, `float`, `shimmer`, `lightbox-in`
- Transition tokens đã thêm ở Phase 1: `micro/fast/normal/smooth/slow` + `ease-spring/ease-smooth/ease-out-expo`

**UI components hiện tại:**
- `button.tsx` — chưa có press feedback (active state)
- `card.tsx` — chưa có transition mặc định
- `dialog.tsx` — dùng Radix animate-in/out cơ bản
- `sheet.tsx` — dùng slide-in/out + `duration-300/500`

---

### Thay đổi cụ thể

#### 1. `tailwind.config.ts` — Thêm keyframes + animation mới

```ts
// Keyframes mới
"slide-up": {
  from: { opacity: "0", transform: "translateY(8px)" },
  to: { opacity: "1", transform: "translateY(0)" },
},
"slide-down": {
  from: { opacity: "0", transform: "translateY(-8px)" },
  to: { opacity: "1", transform: "translateY(0)" },
},
"pulse-soft": {
  "0%, 100%": { opacity: "1" },
  "50%": { opacity: "0.7" },
},
"bounce-in": {
  "0%": { transform: "scale(0)", opacity: "0" },
  "50%": { transform: "scale(1.15)" },
  "100%": { transform: "scale(1)", opacity: "1" },
},
"spin-slow": {
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
},
"progress-bar": {
  from: { transform: "translateX(-100%)" },
  to: { transform: "translateX(100%)" },
},
"skeleton-wave": {
  "0%": { backgroundPosition: "-200% 0" },
  "100%": { backgroundPosition: "200% 0" },
},

// Animation shortcuts mới
"slide-up": "slide-up 0.25s ease-out-expo forwards",
"slide-down": "slide-down 0.25s ease-out-expo forwards",
"pulse-soft": "pulse-soft 2s ease-in-out infinite",
"bounce-in": "bounce-in 0.4s ease-spring forwards",
"spin-slow": "spin-slow 2s linear infinite",
"progress-bar": "progress-bar 1.5s ease-in-out infinite",
"skeleton-wave": "skeleton-wave 1.8s ease-in-out infinite",
```

#### 2. `src/index.css` — Thêm utility classes

```css
@layer utilities {
  /* Micro-interaction utilities */
  .hover-lift {
    @apply transition-all duration-smooth ease-out;
  }
  .hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px -2px rgb(0 0 0 / 0.1);
  }

  .hover-glow:hover {
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.12);
  }

  .press-effect {
    @apply transition-transform duration-micro;
  }
  .press-effect:active {
    transform: scale(0.97);
  }

  /* Staggered appear delays */
  .appear-delay-1 { animation-delay: 50ms; }
  .appear-delay-2 { animation-delay: 100ms; }
  .appear-delay-3 { animation-delay: 150ms; }
  .appear-delay-4 { animation-delay: 200ms; }
}
```

#### 3. `src/components/ui/button.tsx` — Press feedback

Thêm vào base class:
```
active:scale-[0.97] transition-all duration-fast
```

#### 4. `src/components/ui/card.tsx` — Transition mặc định

Thêm vào base class:
```
transition-shadow duration-smooth
```

#### 5. `src/components/ui/dialog.tsx` — Animation mượt hơn

Cải thiện DialogOverlay và DialogContent:
- Overlay: thêm `backdrop-blur-[1px]` cho hiệu ứng subtle blur
- Content: đổi zoom animation timing sang `duration-250` + `ease-out-expo` thay vì `duration-200`

#### 6. `src/components/ui/sheet.tsx` — Slide mượt hơn

- Đổi `data-[state=open]:duration-500` thành `data-[state=open]:duration-300` (bớt chậm)
- Thêm `ease-out-expo` thay vì `ease-in-out` mặc định

---

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `tailwind.config.ts` | +7 keyframes, +7 animation shortcuts |
| `src/index.css` | +4 utility classes (hover-lift, hover-glow, press-effect, appear-delay) |
| `src/components/ui/button.tsx` | +`active:scale-[0.97]` vào base variant |
| `src/components/ui/card.tsx` | +`transition-shadow duration-smooth` |
| `src/components/ui/dialog.tsx` | Cải thiện overlay blur + content timing |
| `src/components/ui/sheet.tsx` | Đổi timing `duration-300` + `ease-out-expo` |

### Rủi ro
- **Thấp** — chỉ thêm animation mới và tinh chỉnh timing
- Button press effect dùng `active:scale` rất nhẹ, không ảnh hưởng accessibility
- Dialog/sheet chỉ đổi timing, không đổi logic

