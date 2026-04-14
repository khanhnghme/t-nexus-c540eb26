

## Plan: Fix màu chữ trong Canvas Editor

### Nguyên nhân
BlockNote v0.47 (package `@blocknote/shadcn`) sử dụng component `DropdownMenuContent` nội bộ **không có Portal** — nghĩa là dropdown (bao gồm color picker) render ngay trong DOM tại vị trí của nút bấm. Khi có parent element có `overflow: hidden` (ví dụ layout container), dropdown bị cắt/ẩn hoàn toàn → người dùng bấm nút "A" (Colors) nhưng không thấy gì.

Project's own `DropdownMenuContent` (trong `src/components/ui/dropdown-menu.tsx`) đã dùng `DropdownMenuPrimitive.Portal` đúng cách → dropdown hiển thị đúng ở root DOM.

### Giải pháp
Truyền prop `shadCNComponents` vào `BlockNoteView` để override DropdownMenu components, sử dụng components từ `src/components/ui/dropdown-menu.tsx` (có Portal).

### Thay đổi

**File: `src/components/canvas/CanvasEditor.tsx`**
1. Import các DropdownMenu components từ `@/components/ui/dropdown-menu`
2. Tạo object `shadCNComponents` override cho `DropdownMenu` 
3. Truyền `shadCNComponents` prop vào `<BlockNoteView>`

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const shadCNComponents = {
  DropdownMenu: {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
  },
};

// In BlockNoteView:
<BlockNoteView
  shadCNComponents={shadCNComponents}
  ...
/>
```

Tổng: **1 file** sửa (`CanvasEditor.tsx`)

