

## Fix lỗi crash "drag_handle_label" / "add_block_label" undefined

### Nguyên nhân gốc

Dòng 171 trong `CanvasEditor.tsx`:
```ts
dictionary: { multi_column: mcLocale } as any,
```
Truyền object chỉ có key `multi_column` → **ghi đè toàn bộ** default dictionary của BlockNote → mất hết các key UI như `drag_handle_label`, `add_block_label`, v.v. → crash ngay khi render editor.

### Cách sửa

**File: `src/components/canvas/CanvasEditor.tsx`**

1. Import `defaultBlockNoteLocales` từ `@blocknote/core` (chứa toàn bộ dictionary mặc định)
2. Thay dòng 171 bằng cách **spread** default locale rồi thêm `multi_column`:

```ts
import { ..., defaultBlockNoteLocales } from "@blocknote/core";

// Trong component:
const baseLocale = isVi ? defaultBlockNoteLocales.en : defaultBlockNoteLocales.en;

const editor = useCreateBlockNote({
  schema,
  initialContent: safeInitialContent as any,
  uploadFile,
  dropCursor: multiColumnDropCursor,
  dictionary: { ...baseLocale, multi_column: mcLocale } as any,
});
```

Cách này giữ nguyên toàn bộ label mặc định (`drag_handle_label`, `add_block_label`, v.v.) và chỉ bổ sung thêm key `multi_column`.

### Kết quả
- Hết crash "Cannot read properties of undefined"
- Editor hoạt động bình thường
- Slash menu vẫn có mục Two/Three Columns

### Files thay đổi
1. `src/components/canvas/CanvasEditor.tsx` — sửa 2 dòng (import + dictionary merge)

