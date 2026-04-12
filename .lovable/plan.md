

## Phần 6: Calendar View — Triển khai chi tiết

### Mục tiêu
Tạo `CalendarView` — hiển thị items trên lưới tháng dựa theo `dateProperty`, hỗ trợ click ngày để tạo item, click item để edit. Tích hợp vào view router trong `DatabaseBlock`.

### Hiện trạng
- Phần 1–5 hoàn thành: types, hook, block, ViewSwitcher, ViewToolbar, TableView, ListView, BoardView
- `DatabaseBlock.tsx` dòng 75–77: calendar view đang fallback về TableView
- `ViewConfig` có `dateProperty?: string` để chọn property date
- Project có sẵn `react-day-picker` và component `Calendar` (src/components/ui/calendar.tsx)
- `InlineCell` hỗ trợ edit date (input type="date")

### Chia 4 bước

---

**Bước 1: Tạo `CalendarView.tsx` — Layout lưới tháng**

File mới: `src/components/canvas/blocks/database/views/CalendarView.tsx`

- Props: `items`, `properties`, `visiblePropertyIds`, `editable`, `onUpdateItem`, `onDeleteItem`, `onAddItem`, `datePropertyId?: string`, `onSetDateProperty?: (id: string) => void`
- Nếu chưa có `datePropertyId` hoặc property không phải type `date` → hiện dropdown chọn (tương tự BoardView khi chưa có groupBy)
- State: `currentMonth` (Date), điều hướng tháng trước/sau
- Render lưới 7 cột (Mon–Sun) x 5–6 hàng, mỗi ô = 1 ngày
- Items được nhóm theo ngày dựa trên `dateProperty` value

**Bước 2: Hiển thị items trên calendar + click tạo mới**

- Mỗi ô ngày: hiện tối đa 2–3 item pills (tên ngắn gọn, badge màu)
- Nếu nhiều hơn → hiện "+N more"
- Click vào ô ngày trống (khi editable) → gọi `onAddItem({ [datePropertyId]: dateString })`
- Items pill hiện tên từ property đầu tiên (Name)

**Bước 3: Click item → popup edit**

- Click vào item pill → mở Popover/Dialog nhỏ
- Trong popup: render tất cả properties dùng `InlineCell` (tái sử dụng từ shared)
- Nút Delete item trong popup
- Đóng popup khi click ngoài

**Bước 4: Tích hợp vào DatabaseBlock.tsx**

Sửa `DatabaseBlock.tsx`:
- Import `CalendarView`
- Trong view router, thay case `"calendar"`:
  ```
  case "calendar":
    return <CalendarView {...commonProps} datePropertyId={activeView?.dateProperty} onSetDateProperty={handleSetDateProperty} />
  ```
- Thêm callback `handleSetDateProperty` → gọi `updateView(viewId, { dateProperty: propertyId })`

---

### Files thay đổi

| File | Action |
|------|--------|
| `src/components/canvas/blocks/database/views/CalendarView.tsx` | Mới — Calendar month grid view |
| `src/components/canvas/blocks/database/DatabaseBlock.tsx` | Sửa — thêm CalendarView vào view router |

### Lưu ý kỹ thuật
- Tự build month grid thuần (div grid 7 cột) thay vì dùng `react-day-picker` DayPicker component — vì cần custom render nội dung trong mỗi ô ngày (pills), DayPicker không hỗ trợ tốt
- `dateProperty` lưu trong `ViewConfig` — khi tạo Calendar view mới, mặc định tìm property type `date` đầu tiên
- Format date: ISO string `YYYY-MM-DD` để so sánh ngày

