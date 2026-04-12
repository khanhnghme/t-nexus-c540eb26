

## Phần 5: Board View (Kanban) — Triển khai chi tiết

### Mục tiêu
Tạo `BoardView` — Kanban board nhóm items theo property `select`, hỗ trợ drag & drop giữa các cột. Tích hợp vào view router trong `DatabaseBlock`.

### Hiện trạng
- Phần 1–4 hoàn thành: types, hook, block, ViewSwitcher, ViewToolbar, TableView, ListView
- `DatabaseBlock.tsx` dòng 59–62: board view đang fallback về TableView
- `ViewConfig` có `groupBy?: string` để chọn property nhóm
- Project dùng `@hello-pangea/dnd` (không phải `@dnd-kit`) — sẽ dùng thư viện này
- `useDatabaseData` đã có `updateItem(itemId, propertyId, value)` để cập nhật khi drop

### Chia 4 bước

---

**Bước 1: Tạo `BoardView.tsx` — Layout cơ bản (không drag)**

File mới: `src/components/canvas/blocks/database/views/BoardView.tsx`

- Props: `items`, `properties`, `visiblePropertyIds`, `editable`, `onUpdateItem`, `onDeleteItem`, `onAddItem`, `groupByPropertyId`
- Tìm `groupBy` property trong `properties` (phải là type `select`)
- Nếu chưa có `groupBy` hoặc property không phải select → hiện thông báo "Select a property to group by" + dropdown chọn
- Mỗi option của select property = 1 column + thêm 1 column "No Status" cho items không có giá trị
- Mỗi column: header (tên option + badge count) + danh sách cards
- Card: hiển thị Name property + secondary badges (giống ListView compact)

**Bước 2: Thêm drag & drop với `@hello-pangea/dnd`**

Trong `BoardView.tsx`:
- Wrap toàn bộ board trong `<DragDropContext onDragEnd={handleDragEnd}>`
- Mỗi column = `<Droppable droppableId={optionId}>`
- Mỗi card = `<Draggable draggableId={itemId}>`
- `handleDragEnd`: lấy `destination.droppableId` (= option id mới) → gọi `onUpdateItem(itemId, groupByPropertyId, newOptionId)`
- Chỉ enable drag khi `editable === true`

**Bước 3: Thêm inline add card trong mỗi column**

- Cuối mỗi column: input "+" để tạo item mới
- Khi submit → `onAddItem({ [namePropertyId]: value, [groupByPropertyId]: columnOptionId })`
- Auto-gán giá trị select property = option của column đó

**Bước 4: Tích hợp vào DatabaseBlock.tsx**

Sửa `DatabaseBlock.tsx`:
- Import `BoardView`
- Trong view router, thay fallback case `"board"`:
  ```
  case "board":
    return <BoardView {...commonProps} groupByPropertyId={activeView?.groupBy} onSetGroupBy={...} />
  ```
- Thêm callback `onSetGroupBy` → gọi `updateView(viewId, { groupBy: propertyId })`

---

### Files thay đổi

| File | Action |
|------|--------|
| `src/components/canvas/blocks/database/views/BoardView.tsx` | Mới — Kanban board với drag & drop |
| `src/components/canvas/blocks/database/DatabaseBlock.tsx` | Sửa — thêm BoardView vào view router |

### Lưu ý kỹ thuật
- Dùng `@hello-pangea/dnd` đã có sẵn trong project (không cần cài thêm)
- `groupBy` lưu trong `ViewConfig` — khi tạo Board view mới, mặc định `groupBy` = property select đầu tiên tìm được
- Column "No Status" cho items có giá trị `null`/`undefined` ở groupBy property

