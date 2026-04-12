

## Phần 3: ViewSwitcher & ViewToolbar — Triển khai chi tiết

### Mục tiêu
Thêm UI chuyển đổi giữa các views (tab bar) và toolbar lọc/sắp xếp/ẩn hiện cột. Tích hợp vào DatabaseBlock hiện tại.

### Hiện trạng
- Phần 1 (types + useDatabaseData) — hoàn thành
- Phần 2 (DatabaseBlock + slash menu) — hoàn thành, render inline table cơ bản
- `useDatabaseData` đã có: `addView`, `updateView`, `deleteView`, `setActiveView`, `views`, `activeView`
- UI components có sẵn: Tabs, Button, Popover, Select, Input, Badge, Checkbox

### Chia 4 bước

---

**Bước 1: Tạo `ViewSwitcher.tsx`**

File mới: `src/components/canvas/blocks/database/ViewSwitcher.tsx`

- Props: `views`, `activeViewId`, `editable`, `onSwitchView`, `onAddView`, `onDeleteView`, `onRenameView`
- Render tab bar ngang:
  - Mỗi view = 1 tab button với icon theo type (Table/Kanban/Calendar/List)
  - Tab active có highlight
  - Double-click tab → inline rename (input thay text)
- Nút "+" cuối tabs:
  - Click → dropdown 4 options: Table, Board, Calendar, List
  - Chọn → gọi `onAddView(name, type)`
- Context menu (right-click) trên tab:
  - Rename, Delete (disable nếu chỉ còn 1 view)
- Chỉ hiện nút "+", rename, delete khi `editable === true`

---

**Bước 2: Tạo `ViewToolbar.tsx`**

File mới: `src/components/canvas/blocks/database/ViewToolbar.tsx`

- Props: `view`, `properties`, `editable`, `onUpdateView`
- 3 nút trên toolbar (chỉ hiện khi editable):

**Filter button:**
- Click → Popover hiện danh sách filter rules
- Mỗi rule: dropdown chọn property → dropdown operator → input value
- Nút "Add filter" thêm rule mới
- Nút x xóa rule
- Operators thay đổi theo property type (text: contains/equals, number: gt/lt, checkbox: equals)

**Sort button:**
- Click → Popover hiện danh sách sort rules
- Mỗi rule: dropdown property → toggle asc/desc
- Nút "Add sort"

**Fields button (toggle visible columns):**
- Click → Popover checklist tất cả properties
- Check/uncheck → update `visibleProperties` trong view config
- Badge hiện số fields đang ẩn

---

**Bước 3: Tích hợp vào DatabaseBlock.tsx**

Sửa `DatabaseBlock.tsx`:
- Import ViewSwitcher + ViewToolbar
- Thêm ViewSwitcher vào header (thay thế text "Database" tĩnh)
- Thêm ViewToolbar giữa header và table
- Wire callbacks: `setActiveView`, `addView`, `deleteView`, `updateView`

---

**Bước 4: Styling & polish**

- ViewSwitcher tabs nhỏ gọn, giống Notion (text + icon nhỏ, không quá cao)
- Toolbar compact, nút ghost với icon, badge count cho active filters/sorts
- Responsive: toolbar wrap trên mobile

---

### Files thay đổi

| File | Action |
|------|--------|
| `src/components/canvas/blocks/database/ViewSwitcher.tsx` | Mới |
| `src/components/canvas/blocks/database/ViewToolbar.tsx` | Mới |
| `src/components/canvas/blocks/database/DatabaseBlock.tsx` | Sửa — thêm ViewSwitcher + ViewToolbar vào renderer |

