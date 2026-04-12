

## Fix lỗi Slash Menu — truyền multi-column dictionary

### Nguyên nhân
Package `@blocknote/xl-multi-column` yêu cầu editor phải có `dictionary.multi_column`. Hiện tại `useCreateBlockNote` không nhận dictionary này → `getMultiColumnSlashMenuItems(editor)` crash → toàn bộ slash menu không hiện.

### Cách sửa

**File: `src/components/canvas/CanvasEditor.tsx`**

1. Import `locales` từ `@blocknote/xl-multi-column`
2. Truyền `dictionary` vào `useCreateBlockNote`:

```ts
import { locales as multiColumnLocales } from "@blocknote/xl-multi-column";

// Chọn locale phù hợp
const mcLocale = isVi ? (multiColumnLocales.vi ?? multiColumnLocales.en) : multiColumnLocales.en;

const editor = useCreateBlockNote({
  schema,
  initialContent: safeInitialContent as any,
  uploadFile,
  dropCursor: multiColumnDropCursor,
  dictionary: { multi_column: mcLocale },
});
```

### Kết quả
- Gõ `/` hiện đầy đủ menu: tất cả block types + "Two Columns" / "Three Columns"
- Không còn lỗi "Multi-column dictionary not found"
- Giữ nguyên kiến trúc slash menu chuẩn — không cần tách toolbar riêng

### Files thay đổi
1. `src/components/canvas/CanvasEditor.tsx` — thêm 3 dòng (import + dictionary config)

