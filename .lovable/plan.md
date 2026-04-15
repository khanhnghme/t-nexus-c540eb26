
Mục tiêu
- Sửa dứt điểm lỗi tràn UI ở phần “Lịch sử trò chuyện” của `/ai-assistant`.
- Tên cuộc trò chuyện dài phải luôn bị giới hạn đúng trong sidebar và hiển thị bằng dấu `...`.
- Menu 3 chấm, ghim/bỏ ghim, và trạng thái active không được làm vỡ layout.

Nhận định từ ảnh + code hiện tại
- Ảnh cho thấy tiêu đề đang bị cắt ngang mép phải, chưa ellipsis đúng chuẩn.
- Trong `src/pages/AIAssistant.tsx`, item lịch sử hiện đang để icon, title và menu 3 chấm cùng tham gia một hàng `flex`.
- Dù đã có `truncate`, nhưng ràng buộc chiều rộng vẫn chưa đủ chặt ở toàn bộ chuỗi container (`item -> title wrapper -> scroll container`), nên title vẫn có thể bị tràn.
- Nút menu 3 chấm hiện nằm ngay trong flow của hàng, nên khi hover vẫn có thể ảnh hưởng không gian của text.

Kế hoạch fix
1. Cố định lại layout từng item lịch sử
- Chuyển item sang cấu trúc ổn định hơn: `icon | title(minmax(0,1fr)) | actions`.
- Bổ sung đầy đủ `w-full max-w-full min-w-0 overflow-hidden` cho item và wrapper chứa title.
- Đổi phần title sang phần tử block rõ ràng để `truncate` hoạt động chắc chắn.

2. Tách vùng actions khỏi vùng text
- Giữ menu 3 chấm ở một vùng width cố định hoặc đặt tuyệt đối ở mép phải và chừa khoảng trống sẵn cho text.
- Đảm bảo hover menu không làm thay đổi layout hoặc đẩy text sang phải.

3. Khóa overflow ngang ở cấp sidebar
- Siết lại `ScrollArea` và các group wrapper trong `historySidebar` bằng `overflow-x-hidden`, `max-w-full`, `min-w-0`.
- Chỉ áp dụng local cho route AI để tránh ảnh hưởng các khu vực khác đang dùng `ScrollArea`.

4. Cải thiện UX cho tên dài
- Giữ ellipsis mặc định trên danh sách.
- Thêm `title={conv.title}` hoặc tooltip nhẹ để vẫn xem được tên đầy đủ khi cần.

5. Rà soát hồi quy
- Test tên rất dài tiếng Việt có dấu.
- Test chuỗi dài không có khoảng trắng.
- Test item đang active, item được ghim, hover hiện menu 3 chấm, và lúc sidebar mở/đóng.
- Test ở viewport hiện tại và viewport hẹp hơn để đảm bảo không còn tràn.

Technical details
- File chính: `src/pages/AIAssistant.tsx`
- Ưu tiên fix cục bộ trong AI sidebar.
- Chỉ đụng `src/components/ui/scroll-area.tsx` nếu thật sự cần mở rộng API/class cho viewport; nếu không sẽ giữ nguyên shared component để tránh regression.

Kết quả mong đợi
- Không còn text tràn khỏi sidebar.
- Tên dài luôn hiển thị `...` đúng chuẩn.
- Menu 3 chấm và ghim/bỏ ghim vẫn hoạt động bình thường.
- Sidebar “Lịch sử trò chuyện” gọn, sạch, ổn định trên mọi trạng thái.
