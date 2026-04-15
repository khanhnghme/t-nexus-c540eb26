
Mục tiêu
- Sửa dứt điểm lỗi tên cuộc trò chuyện dài làm vỡ layout ở sidebar `/ai-assistant`.
- Tên dài phải luôn hiển thị `...` và không che/đẩy nút 3 chấm.

Nguyên nhân đã xác định
- Ở `src/pages/AIAssistant.tsx`, lịch sử trò chuyện đang bọc trong `ScrollArea`.
- `ScrollArea` hiện dùng Radix viewport; bên trong nó có content wrapper tự co theo nội dung. Với title dài, chiều rộng hàng bị nở theo text thay vì bị khóa theo bề ngang sidebar.
- Row lịch sử hiện còn dùng title + menu theo layout chưa có “phần còn lại” cố định cho text: nút 3 chấm đặt `absolute`, còn text `w-full` nên bị clip ở mép sidebar thay vì kích hoạt ellipsis thật sự.

Kế hoạch fix
1. Đổi riêng phần lịch sử trò chuyện sang native scroll container
- Bỏ `ScrollArea` ở sidebar lịch sử của `/ai-assistant`.
- Dùng `div` thường với `flex-1 overflow-y-auto overflow-x-hidden min-w-0`.
- Mục đích: loại bỏ hoàn toàn hiệu ứng sizing của wrapper bên trong Radix gây sai width.

2. Refactor mỗi item lịch sử sang layout khóa cứng chiều ngang
- Chuyển item sang `grid` hoặc `flex` có cột action cố định, ví dụ: `title(minmax(0,1fr)) | actions(32px)`.
- Title wrapper có đủ `min-w-0 overflow-hidden`.
- Text node dùng `truncate` trên chính phần tử hiển thị tên.
- Không để text và menu chồng nhau bằng `absolute` nữa.

3. Giữ thao tác 3 chấm luôn dùng được
- Nút 3 chấm có vùng rộng cố định, không phụ thuộc độ dài tiêu đề.
- Cho hiện trên hover/focus/active để người dùng luôn thao tác được.
- Nếu cần, giữ `title={conv.title}` để xem tên đầy đủ khi hover.

4. Rà soát trạng thái đặc biệt
- Kiểm tra item đang active, item đã ghim, và danh sách dài nhiều nhóm thời gian.
- Đảm bảo pin indicator không làm mất chỗ của ellipsis.

Technical details
- File chính: `src/pages/AIAssistant.tsx`
- Không cần đụng database.
- Ưu tiên không sửa shared `src/components/ui/scroll-area.tsx` để tránh regression toàn hệ thống; chỉ sửa cục bộ route AI.

Kết quả mong đợi
- Tên rất dài vẫn gọn trong sidebar và luôn có `...`.
- Không còn tràn ngang hoặc vỡ layer.
- Nút 3 chấm luôn hiện/nhấn được bình thường.
- Lịch sử trò chuyện ổn định ở cả title tiếng Việt dài và chuỗi dài không có khoảng trắng.

Checklist verify sau khi implement
- Test 1 title dài tiếng Việt có dấu.
- Test 1 title dài không có khoảng trắng.
- Test item ghim/bỏ ghim, item active, hover hiện menu.
- Test danh sách nhiều cuộc trò chuyện vẫn không có horizontal overflow.
- Test end-to-end việc mở menu 3 chấm và xóa/ghim vẫn hoạt động bình thường.
