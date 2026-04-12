

## Phần 1: Types & Data Layer — Triển khai chi tiết

### Mục tiêu
Tạo nền tảng dữ liệu cho Database Block: định nghĩa types, helper functions, filter/sort logic, và custom hook quản lý CRUD + view state. Chưa có UI — chỉ data layer.

### File 1: `src/components/canvas/blocks/database/types.ts`

**Types:**
- `PropertyType`: `'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'person'`
- `SelectOption`: `{ id, label, color }`
- `PropertyDef`: `{ id, name, type, options? }`
- `DatabaseItem`: `{ id, properties: Record<string, any>, createdAt }`
- `ViewType`: `'table' | 'board' | 'calendar' | 'list'`
- `FilterOperator`: `'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty' | 'gt' | 'lt'`
- `FilterRule`: `{ propertyId, operator, value }`
- `SortRule`: `{ propertyId, direction: 'asc' | 'desc' }`
- `ViewConfig`: `{ id, name, type, filters, sorts, groupBy?, dateProperty?, visibleProperties }`

**Helper functions:**
- `generateId()` — `crypto.randomUUID()` hoặc fallback nanoid-style
- `createDefaultProperties()` — trả về `[{ id, name: "Name", type: "text" }, { id, name: "Status", type: "select", options: [Todo/In Progress/Done] }]`
- `createDefaultView(name, type)` — trả về ViewConfig mặc định với visibleProperties = all
- `createDefaultDatabase()` — trả về `{ properties, items: [], views: [defaultTableView], activeViewId }`

**Pure functions:**
- `applyFilters(items, filters, properties)` — match từng item với filter rules theo type
- `applySorts(items, sorts, properties)` — sort theo direction, xử lý text/number/date so sánh
- `applyFiltersAndSorts(items, view, properties)` — combine cả 2

---

### File 2: `src/components/canvas/blocks/database/useDatabaseData.ts`

**Input:** `{ blockProps, updateProps }` — props từ `createReactBlockSpec` render function

**State parsing:**
- `useMemo` parse `blockProps.properties` / `blockProps.items` / `blockProps.views` từ JSON string → typed objects
- Fallback `createDefaultDatabase()` nếu props rỗng/malformed

**CRUD operations (memoized callbacks):**
- `addItem(initialValues?)` — tạo DatabaseItem mới, serialize lại items JSON
- `updateItem(itemId, propertyId, value)` — update 1 field
- `deleteItem(itemId)` — remove item
- `addProperty(name, type)` — thêm PropertyDef, tự thêm vào visibleProperties của tất cả views
- `updateProperty(propertyId, updates)` — rename, đổi type
- `deleteProperty(propertyId)` — xóa property + cleanup items + views

**View management:**
- `addView(name, type)` — thêm ViewConfig mới
- `updateView(viewId, updates)` — update filters/sorts/groupBy/visible
- `deleteView(viewId)` — xóa (giữ tối thiểu 1 view)
- `setActiveView(viewId)` — update activeViewId

**Computed:**
- `filteredItems` = `useMemo(() => applyFiltersAndSorts(items, activeView, properties), [items, activeView, properties])`
- `activeView` = `views.find(v => v.id === activeViewId)`

**Serialize pattern:** Mỗi mutation function → clone state → modify → `JSON.stringify()` → gọi `updateProps({ items: newJson })`. Throttle serialize 100ms để tránh quá nhiều block update khi typing nhanh.

---

### Không thay đổi file nào khác
Phần 1 chỉ tạo 2 file mới, không sửa CanvasEditor hay đăng ký block. Việc đó thuộc Phần 2.

### Files thay đổi
| File | Action |
|------|--------|
| `src/components/canvas/blocks/database/types.ts` | Mới |
| `src/components/canvas/blocks/database/useDatabaseData.ts` | Mới |

