

## Phần 4: Table View & List View — Triển khai chi tiết

### Mục tiêu
Tách inline table hiện tại trong `DatabaseBlock.tsx` thành component `TableView` riêng biệt, tạo `ListView` mới, và cập nhật `DatabaseBlock` để render view theo `activeView.type`.

### Hiện trạng
- Phần 1-3 hoàn thành: types, hook, block, ViewSwitcher, ViewToolbar
- `DatabaseBlock.tsx` đang render inline table trực tiếp (dòng 189-249)
- `InlineCell` component đã có sẵn trong DatabaseBlock.tsx — cần tái sử dụng

### Chia 4 bước

---

**Bước 1: Tách `InlineCell` thành shared component**

File mới: `src/components/canvas/blocks/database/views/InlineCell.tsx`

- Di chuyển `InlineCell` + `CellProps` interface từ `DatabaseBlock.tsx` ra file riêng
- Export để cả TableView và ListView cùng dùng

---

**Bước 2: Tạo `TableView.tsx`**

File mới: `src/components/canvas/blocks/database/views/TableView.tsx`

- Props: `items`, `properties`, `visiblePropertyIds`, `editable`, `onUpdateItem`, `onDeleteItem`, `onAddItem`, `onAddProperty`
- Di chuyển logic table hiện tại từ DatabaseBlock (thead/tbody/add row) vào đây
- Dùng `InlineCell` cho mỗi cell
- Header có nút "+" để thêm column
- Footer có input "New item..." + nút Add
- Nút xóa row ở cuối mỗi hàng (chỉ khi editable)

---

**Bước 3: Tạo `ListView.tsx`**

File mới: `src/components/canvas/blocks/database/views/ListView.tsx`

- Props: tương tự TableView
- Compact list — mỗi item 1 dòng:
  - Cột trái: property đầu tiên (Name) hiển thị text lớn hơn
  - Cột phải: badges cho select properties, text nhỏ cho các fields khác
- Click vào item → expand inline (show tất cả editable fields bên dưới)
- State local: `expandedItemId`
- Khi expanded: render mỗi property = label + InlineCell
- Nút "+" ở cuối danh sách để thêm item mới

---

**Bước 4: Cập nhật `DatabaseBlock.tsx` — View routing**

Sửa `DatabaseBlock.tsx`:

- Xóa inline table code (dòng 189-266)
- Xóa `InlineCell` component (dòng 13-113)
- Import `TableView` và `ListView`
- Thêm view router theo `activeView.type`:
  ```
  switch (activeView.type) {
    case "table": return <TableView ... />
    case "list": return <ListView ... />
    default: return <TableView ... />  // fallback cho board/calendar (phần 5,6)
  }
  ```
- Truyền props: `filteredItems`, `properties`, `activeView.visibleProperties`, `editable`, callbacks

---

### Files thay đổi

| File | Action |
|------|--------|
| `src/components/canvas/blocks/database/views/InlineCell.tsx` | Mới — shared cell renderer |
| `src/components/canvas/blocks/database/views/TableView.tsx` | Mới — full table view |
| `src/components/canvas/blocks/database/views/ListView.tsx` | Mới — compact list view |
| `src/components/canvas/blocks/database/DatabaseBlock.tsx` | Sửa — xóa inline code, thêm view routing |

