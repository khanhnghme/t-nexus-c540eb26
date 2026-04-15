
Mục tiêu fix lần này

- Xóa hẳn thanh cuộn/thanh “score” riêng còn sót lại trong khung chat của `/ai-assistant`
- Chỉ giữ đúng 1 nơi scroll ở cấp trang/layout, không để chat tự sinh thêm scroll riêng
- Gỡ toàn bộ phần UI/quota/score còn sót lại trên route `/ai-assistant`

Nguyên nhân đã xác định

- `DashboardLayout` đang có scroll riêng ở `.grid-cell-content` (`src/index.css`)
- `src/pages/AIAssistant.tsx` lại tạo thêm scroll thứ hai ở `main` với `overflow-y-auto`
- Route AI còn bị bọc bởi wrapper mặc định của layout (`max-w-[1100px] mx-auto px-12 py-8 ...` trong `src/components/layout/DashboardLayout.tsx`), làm tăng thêm chiều cao và dễ sinh nested scroll
- Trong `AIAssistant.tsx` vẫn còn vài nhánh UI phụ thuộc quota như `remainingQuestions`, placeholder “Đã hết lượt...”, dòng báo hết lượt ở empty state, nên dù không còn progress bar lớn vẫn còn “logic score” lộ ra trên trang

Kế hoạch triển khai

1. Tách `/ai-assistant` ra khỏi wrapper nội dung mặc định của `DashboardLayout`
- Ở `src/components/layout/DashboardLayout.tsx`, thêm nhánh render riêng cho route AI
- Không bọc AI page trong khối `max-w-[1100px] mx-auto px-12 py-8`
- Cho AI route dùng full content cell để chiếm trọn chiều cao/chiều ngang cần thiết

2. Chuyển về mô hình 1-scroll-owner duy nhất
- Giữ scroll ở content area của layout
- Xóa scroll nội bộ trong `src/pages/AIAssistant.tsx`:
  - bỏ `overflow-y-auto` ở vùng chat chính
  - bỏ cấu trúc đang ép `h-[calc(100dvh-56px)]` theo kiểu tự quản viewport nếu không còn cần
- Đổi page AI sang `h-full / min-h-full` để bám đúng chiều cao cell của dashboard, không tự tạo thêm một viewport thứ hai

3. Giữ composer/chat input cố định đúng UX nhưng không sinh nested scroll
- Đưa input về dạng sticky ở đáy route AI hoặc bố cục full-height bám theo content cell
- Messages sẽ nằm trong luồng nội dung chính của trang, không có khung chat tự cuộn riêng
- Vẫn giữ auto-scroll xuống cuối khi AI stream trả lời, nhưng logic scroll sẽ bám theo scroll container của page thay vì `main` nội bộ

4. Gỡ sạch phần “score/quota UI” còn sót trên `/ai-assistant`
- Xóa toàn bộ render-path liên quan quota khỏi `src/pages/AIAssistant.tsx`:
  - placeholder kiểu “Đã hết lượt...”
  - dòng báo “Bạn đã hết lượt hỏi tháng này...”
  - trạng thái disable hiển thị như một dấu hiệu score/quota ngoài khung chat
- Giữ enforcement ở mức xử lý gửi tin nhắn/toast nếu cần, nhưng không còn bất kỳ component hiển thị score/quota trên route này

5. Rà soát lại để không còn thành phần ngoài khung chat tạo cảm giác “score”
- Kiểm tra header/topbar của route AI không có badge/counter/progress
- Đảm bảo sidebar lịch sử, empty state, suggestion cards và footer input không render gì giống progress/quota
- Chỉ giữ nội dung chat là trung tâm chính của trang

Files sẽ chỉnh

- `src/components/layout/DashboardLayout.tsx`
- `src/pages/AIAssistant.tsx`
- có thể cần bổ sung class điều kiện trong `src/index.css` để route AI dùng full-bleed/full-height sạch hơn

Kết quả mong đợi sau khi làm

- `/ai-assistant` chỉ còn 1 thanh cuộn duy nhất ở cấp trang/layout
- Không còn thanh cuộn riêng nằm trong khung chat
- Không còn bất kỳ score/quota/progress UI nào xuất hiện trên route `/ai-assistant`
- Chat area chiếm phần lớn không gian, nhìn sạch và đúng kiểu AI chat tập trung nội dung

Checklist verify sau khi implement

- Empty state không xuất hiện thanh cuộn phụ
- Khi chat dài nhiều message vẫn chỉ có 1 scrollbar
- Khi AI stream trả lời, nội dung vẫn tự bám xuống dưới đúng
- Sidebar lịch sử mở/đóng không làm xuất hiện thêm scroll lồng nhau
- Không còn text/bar nào liên quan quota/score trên toàn route `/ai-assistant`
