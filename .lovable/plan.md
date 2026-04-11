
## Phase 7 — Block `/calendar` — Mini Calendar hiển thị Task Deadlines ✅ HOÀN TẤT

### Tổng kết
- **Giai đoạn 1/4**: Tạo CalendarBlock, fetch tasks có deadline, render mini calendar với dots ✅
- **Giai đoạn 2/4**: Realtime subscription — tự động cập nhật khi tasks thay đổi ✅
- **Giai đoạn 3/4**: Selected Day Panel — click ngày hiện danh sách tasks ✅
- **Giai đoạn 4/4**: Inline task creation — tạo task nhanh với deadline từ calendar ✅

## Phase 8 — Block `/note` — Callout Block với Rich Text (Đang triển khai)

### Giai đoạn 1/4: Tạo NoteBlock — Callout cơ bản ✅
- Custom block `noteCallout` với `createReactBlockSpec`
- Props: `icon` (default 💡), `color` (default #f0f9ff)
- `content: "inline"` — rich text bên trong block
- 6 preset colors với border-left accent
- Đăng ký trong CanvasEditor schema
