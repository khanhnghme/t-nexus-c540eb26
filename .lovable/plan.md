

## Sửa lỗi Slash Menu không hoạt động

### Nguyên nhân
Khi sử dụng `withMultiColumn`, BlockNote yêu cầu phải tắt slash menu mặc định (`slashMenu={false}`) và thay bằng `SuggestionMenuController` tùy chỉnh. Hiện tại code đang dùng `slashMenu={editable}` (slash menu mặc định) — không tương thích với schema đã bọc `withMultiColumn`, nên menu không hiện khi gõ `/`.

### Cách sửa

**File: `src/components/canvas/CanvasEditor.tsx`**

1. Import thêm từ `@blocknote/react`:
   - `SuggestionMenuController`, `getDefaultReactSlashMenuItems`
   - `filterSuggestionItems` từ `@blocknote/core`
   - `combineByGroup` từ `@blocknote/core`
   - `getMultiColumnSlashMenuItems` từ `@blocknote/xl-multi-column`

2. Tạo `getSlashMenuItems` function bằng `useMemo`:
   - Merge `getDefaultReactSlashMenuItems(editor)` + `getMultiColumnSlashMenuItems(editor)` qua `combineByGroup`
   - Filter bằng `filterSuggestionItems`

3. Đổi `BlockNoteView`:
   - Set `slashMenu={false}`
   - Thêm `<SuggestionMenuController triggerCharacter="/" getItems={getSlashMenuItems} />` bên trong `BlockNoteView`

### Kết quả
- Gõ `/` sẽ hiện đầy đủ menu bao gồm cả mục "Two Columns" / "Three Columns"
- Các block type tùy chỉnh (taskList, memberList, calendarView, noteCallout, toggleBlock) vẫn xuất hiện trong menu

### Files thay đổi
1. `src/components/canvas/CanvasEditor.tsx` — sửa slash menu

