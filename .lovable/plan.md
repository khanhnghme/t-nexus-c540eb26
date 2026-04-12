

## Phần 2: DatabaseBlock — BlockNote Integration

### Mục tiêu
Đăng ký database block vào editor, thêm slash command `/database`, render placeholder UI với table view cơ bản. Sau phần này, user gõ `/database` sẽ tạo được block hoạt động.

### Hiện trạng
- Phần 1 hoàn thành: `types.ts` + `useDatabaseData.ts` đã có
- Pattern đăng ký block: `createReactBlockSpec` + thêm vào `schema` blockSpecs (xem TaskBlock, CalendarBlock)
- Slash menu: dùng `combineByGroup` + `filterSuggestionItems`

### Chia 4 bước triển khai

---

**Bước 1: Tạo `DatabaseBlock.tsx` — Block spec + Renderer shell**

File mới: `src/components/canvas/blocks/database/DatabaseBlock.tsx`

- `createReactBlockSpec` với type `"databaseView"`, propSchema:
  - `properties`: `{ default: "" }` (JSON string)
  - `items`: `{ default: "" }` (JSON string)
  - `views`: `{ default: "" }` (JSON string)
  - `activeViewId`: `{ default: "" }` (string)
- Content: `"none"`
- Render function:
  - Wrap trong `<div contentEditable={false}>` (pattern giống TaskBlock)
  - Gọi `useDatabaseData({ blockProps: props, updateProps })` để lấy data
  - Render header: icon Database + title "Database"
  - Render placeholder Table view inline (simple HTML table với properties làm header, items làm rows)
  - Nút "+ New" để `addItem()`
  - Chưa cần ViewSwitcher/ViewToolbar phức tạp (phần 3)

**Bước 2: Đăng ký block vào schema**

File sửa: `src/components/canvas/CanvasEditor.tsx`

- Import: `import { DatabaseViewBlock } from "./blocks/database/DatabaseBlock";`
- Thêm vào blockSpecs: `databaseView: DatabaseViewBlock(),`

**Bước 3: Thêm slash menu item**

File sửa: `src/components/canvas/CanvasEditor.tsx`

- Trong `getSlashMenuItems`, tạo custom item:
  ```
  { title: "Database", group: "Advanced", icon: Database,
    onItemClick: () => editor.insertBlocks([{ type: "databaseView" }], ...) }
  ```
- Thêm vào `combineByGroup(defaultItems, mcItems, customItems)`

**Bước 4: Inline table view cơ bản trong DatabaseBlock**

Trong `DatabaseBlock.tsx`:
- Render `<table>` với:
  - Header row = `properties.filter(p => activeView.visibleProperties.includes(p.id))`
  - Body rows = `filteredItems` → cells editable (input cho text/number, checkbox cho checkbox)
- `updateItem(itemId, propertyId, value)` khi blur/change
- Nút "+" ở header cuối để `addProperty("New Column", "text")`
- Style: dùng Tailwind classes, border, hover highlight

---

### Files thay đổi

| File | Action |
|------|--------|
| `src/components/canvas/blocks/database/DatabaseBlock.tsx` | Mới |
| `src/components/canvas/CanvasEditor.tsx` | Sửa — import + blockSpecs + slash menu |

### Lưu ý kỹ thuật
- `updateProps` trong `createReactBlockSpec` render function: dùng `props.block.props` để đọc, `editor.updateBlock(props.block, { props: updates })` để ghi — cần verify pattern từ BlockNote API
- Inline table ở bước 4 là temporary — sẽ được thay thế bằng `TableView` component chính thức ở phần 4
- Không cần cài thêm thư viện

