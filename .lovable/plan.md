

# Thêm rule cho AI đọc và xử lý file đính kèm

## Vấn đề
Hiện tại system prompt không có hướng dẫn nào về việc xử lý file đính kèm. AI chỉ nhận nội dung file dưới dạng context block nhưng không có rule rõ ràng về cách phản hồi dựa trên file.

## Thay đổi

### 1. Cập nhật System Prompt (`team-assistant/index.ts`)
Thêm section mới trong `buildSystemPrompt` — quy tắc xử lý file đính kèm:

```
## XỬ LÝ FILE ĐÍNH KÈM
Khi người dùng gửi file kèm câu hỏi:
1. ✅ ĐỌC và PHÂN TÍCH nội dung file text (txt, csv, json, js, py, md, xml, yaml...)
2. ✅ THỰC HIỆN yêu cầu hợp lệ: tóm tắt, phân tích, giải thích, sửa lỗi, chuyển đổi format, trả lời câu hỏi dựa trên nội dung
3. ✅ Với file CSV/bảng: đọc dữ liệu, thống kê, trả lời câu hỏi cụ thể
4. ✅ Với file code: review, giải thích, gợi ý sửa lỗi
5. ✅ Với file JSON/XML: parse và trích xuất thông tin theo yêu cầu
6. ❌ KHÔNG thực thi code hoặc chạy script
7. ❌ KHÔNG tạo/sửa/xóa dữ liệu hệ thống dựa trên file
8. ❌ KHÔNG xử lý file chứa nội dung độc hại, spam, hoặc vi phạm
9. ⚠️ Với file nhị phân (PDF, docx, ảnh...): thông báo chỉ đọc được file văn bản thuần
10. ⚠️ Nếu file quá lớn bị cắt ngắn: thông báo cho người dùng biết
```

### 2. Mở rộng khả năng đọc file (`team-assistant/index.ts`)
Hiện tại `isTextBased` regex chỉ bao gồm một số MIME type cơ bản. Mở rộng thêm:
- `text/*` (đã có)
- `application/pdf` → ghi nhận metadata (không đọc được nội dung)
- Thêm các MIME: `application/x-python`, `application/sql`, `application/x-sh`, `application/x-httpd-php`
- Fallback: nếu file_name có extension `.py`, `.sql`, `.sh`, `.log`, `.env`, `.ini`, `.cfg`, `.toml` → cũng coi là text

### 3. i18n labels
Thêm label thông báo:
```
aiFileReadSuccess: 'File content loaded' / 'Đã đọc nội dung file'
aiFileNotReadable: 'This file type cannot be read directly' / 'Loại file này không thể đọc trực tiếp'
```

## Files thay đổi
1. `supabase/functions/team-assistant/index.ts` — thêm rules vào system prompt + mở rộng MIME detection
2. `src/lib/i18n/en.ts` — thêm labels
3. `src/lib/i18n/vi.ts` — thêm labels

## Không thay đổi
- DB, RLS, R2 storage
- Frontend upload UI
- Credit/billing logic

