

## Phase 1: Cài đặt & Tích hợp Multi-Column vào BlockNote Editor

### Mục tiêu
Cho phép người dùng tạo layout chia cột (2-3 cột) bằng cách gõ `/` → chọn "Columns", kéo thả block giữa các cột.

### Bước thực hiện

**Bước 1: Cài package**
- Thêm `@blocknote/xl-multi-column@^0.47.3` vào `package.json`

**Bước 2: Cập nhật `src/components/canvas/CanvasEditor.tsx`**

| Thay đổi | Chi tiết |
|----------|----------|
| Import | Thêm `withMultiColumn`, `multiColumnDropCursor` từ `@blocknote/xl-multi-column` |
| Schema | Wrap schema hiện tại: `withMultiColumn(BlockNoteSchema.create({ blockSpecs: { ...defaultBlockSpecs, taskList, memberList, ... } }))` |
| Editor config | Thêm `dropCursor: multiColumnDropCursor` vào `useCreateBlockNote()` |
| filterBlocks | `validTypes` đã tự động lấy từ `schema.blockSpecs` nên `columnList` và `column` sẽ được cho phép tự động — không cần sửa logic |

**Bước 3: Verify**
- Gõ `/` → menu hiện mục "Columns"
- Chọn → tạo layout 2 cột
- Kéo block vào/ra giữa các cột hoạt động
- Pages cũ (không có columns) vẫn load bình thường

### Files thay đổi
1. `package.json` — thêm 1 dependency
2. `src/components/canvas/CanvasEditor.tsx` — 3 dòng import + wrap schema + thêm dropCursor config

### Không thay đổi
- Database — không cần migration
- Các custom block hiện có — không bị ảnh hưởng
- Logic autosave/export — giữ nguyên (Phase 3 mới xử lý export)

