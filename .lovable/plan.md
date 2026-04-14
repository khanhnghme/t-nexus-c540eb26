

## Phase 3: Tích hợp Lottie Animation — Chi tiết triển khai

### Hiện trạng

- **Chưa có** `lottie-react` hay bất kỳ Lottie package nào
- Empty states hiện tại: mỗi component tự code inline (icon + text), không có component chung
- Có ít nhất 8 files dùng empty state pattern tương tự nhau nhưng không thống nhất
- `skeleton.tsx` dùng `animate-pulse` cơ bản

---

### Thay đổi cụ thể

#### 1. Cài đặt dependency

```bash
npm i lottie-react
```

#### 2. Tạo `src/components/ui/lottie-player.tsx`

Wrapper component lazy-loaded:

```tsx
import React, { Suspense } from "react";
import { cn } from "@/lib/utils";

const LottieReact = React.lazy(() => import("lottie-react"));

interface LottiePlayerProps {
  animationData: Record<string, unknown>;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  speed?: number;
}

export function LottiePlayer({ 
  animationData, loop = true, autoplay = true, 
  className, speed = 1 
}: LottiePlayerProps) {
  return (
    <Suspense fallback={<div className={cn("animate-pulse bg-muted rounded-md", className)} />}>
      <LottieReact
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        className={className}
        style={{ animationSpeed: speed }}
      />
    </Suspense>
  );
}
```

#### 3. Tạo `src/components/ui/empty-state.tsx`

Component chung cho toàn hệ thống, hỗ trợ cả Lottie và icon fallback:

```tsx
interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  animationData?: Record<string, unknown>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}
```

- Nếu có `animationData` → render `LottiePlayer` (120x120px)
- Nếu chỉ có `icon` → render icon với styling muted
- Layout: flex-col, center, padding `py-12`
- Typography: `title` dùng `text-heading-4`, `description` dùng `text-body-sm text-muted-foreground`

#### 4. Tạo `src/components/ui/loading-animation.tsx`

Loading component với CSS fallback (không bắt buộc Lottie JSON):

```tsx
interface LoadingAnimationProps {
  animationData?: Record<string, unknown>;
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}
```

- Nếu có `animationData` → dùng LottiePlayer
- Nếu không → fallback CSS spinner (3 dots bouncing dùng keyframe `bounce-in` từ Phase 2)
- Sizes: sm=32px, md=64px, lg=120px

#### 5. Tạo Lottie JSON data inline (không cần file riêng)

Thay vì tải file JSON bên ngoài, tạo 3 animation data nhỏ gọn trực tiếp trong code:

- `src/assets/lottie/empty-box.ts` — export const: hộp rỗng đơn giản (SVG path animation, ~2KB)
- `src/assets/lottie/loading-dots.ts` — export const: 3 dots bouncing (~1KB)  
- `src/assets/lottie/success-check.ts` — export const: checkmark draw animation (~1.5KB)

Các file này là Lottie JSON objects viết tay, rất nhẹ, chỉ dùng basic shape + transform animations.

---

### Files thay đổi

| File | Loại | Mô tả |
|------|------|-------|
| `package.json` | Sửa | +`lottie-react` |
| `src/components/ui/lottie-player.tsx` | Mới | Wrapper component lazy-loaded |
| `src/components/ui/empty-state.tsx` | Mới | Reusable empty state component |
| `src/components/ui/loading-animation.tsx` | Mới | Loading spinner với CSS fallback |
| `src/assets/lottie/empty-box.ts` | Mới | Lottie JSON data cho empty state |
| `src/assets/lottie/loading-dots.ts` | Mới | Lottie JSON data cho loading |
| `src/assets/lottie/success-check.ts` | Mới | Lottie JSON data cho success feedback |

### Không thay đổi

- Không sửa các component hiện có (sẽ dùng `EmptyState` component ở Phase 4 khi audit)
- Không ảnh hưởng bundle size nhờ lazy loading

### Rủi ro
- **Không có** — chỉ thêm file mới, không sửa code cũ
- Lottie-react lazy loaded → không tăng initial bundle

