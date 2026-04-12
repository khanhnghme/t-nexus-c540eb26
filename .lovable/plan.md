

## Fix nút "+" (Add block) trong BlockNote editor không mở menu chọn loại block

### Vấn đề
Nút "+" trong side menu của BlockNote editor (xuất hiện bên trái mỗi block khi hover) khi bấm chỉ tạo thêm 1 paragraph trống thay vì mở menu chọn loại block (heading, list, task list, v.v.). 

Nguyên nhân: Console log cho thấy lỗi `Function components cannot be given refs` trong BlockNote shadcn theme → dropdown menu của nút "+" không render được do xung đột ref giữa BlockNote shadcn 0.47.x và phiên bản Radix hiện tại.

### Giải pháp
Nâng cấp BlockNote packages lên phiên bản mới nhất (0.33+ → latest stable) để fix lỗi ref forwarding compatibility. Nếu upgrade gây breaking changes, fallback sẽ là tạo custom SideMenu component thay thế default.

### Thay đổi

| File | Nội dung |
|------|----------|
| **`package.json`** | Upgrade `@blocknote/core`, `@blocknote/react`, `@blocknote/shadcn` lên phiên bản mới nhất stable |
| **`src/components/canvas/CanvasEditor.tsx`** | Điều chỉnh import/API nếu có breaking changes sau upgrade |

### Bước thực hiện
1. Kiểm tra phiên bản mới nhất của BlockNote và changelog
2. Upgrade cả 3 packages đồng bộ
3. Fix bất kỳ breaking changes nào trong CanvasEditor và custom blocks
4. Verify nút "+" mở đúng menu chọn block type

