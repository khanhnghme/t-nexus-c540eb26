

# Cho phép AI xử lý file nhị phân (ảnh, PDF) qua multimodal

## Phân tích hiện tại
- **Gemini 2.5 Flash-lite** (Free/Plus): hỗ trợ multimodal — có thể đọc ảnh, PDF qua base64
- **DeepSeek V3** (Pro+): chỉ text — không hỗ trợ multimodal
- Hiện tại: file nhị phân bị bỏ qua với thông báo "không thể đọc trực tiếp"

## Thay đổi

### 1. Cập nhật xử lý file trong `team-assistant/index.ts`

Thay đổi logic xử lý attachment (dòng ~780-810):

- **File text**: giữ nguyên — đọc nội dung, append vào message dạng text
- **File ảnh** (png, jpg, jpeg, gif, webp): tải từ R2, convert sang base64, gửi dạng multimodal `image_url` content part
- **File PDF**: tải từ R2, convert sang base64, gửi dạng `image_url` với mime `application/pdf` (Gemini hỗ trợ)
- **Khi dùng DeepSeek (Pro+)**: vẫn chỉ đọc text file, file nhị phân thông báo "model hiện tại không hỗ trợ đọc file này"

Cụ thể:
- Thêm biến `useMultimodal` dựa trên model (true cho Gemini, false cho DeepSeek)
- File ảnh/PDF: fetch từ R2 → `arrayBuffer()` → base64 → tạo content part `{ type: "image_url", image_url: { url: "data:{mime};base64,{data}" } }`
- Convert message cuối thành array format: `content: [{ type: "text", text: "..." }, { type: "image_url", ... }]`
- Giới hạn file nhị phân tối đa 5MB để tránh payload quá lớn

### 2. Cập nhật system prompt

- Xóa dòng 9 (`⚠️ Với file nhị phân...thông báo chỉ đọc được file văn bản thuần`)
- Thay bằng: `✅ Với file ảnh (PNG, JPG, GIF, WEBP): phân tích, mô tả, trích xuất thông tin từ hình ảnh`
- Thêm: `✅ Với file PDF: đọc và phân tích nội dung tài liệu`

### 3. Cập nhật i18n labels

- Sửa `aiFileNotReadable` → chỉ dùng cho DeepSeek fallback case
- Thêm: `aiFileImageAnalyzed` / `aiFilePdfAnalyzed` cho UI feedback

## Files thay đổi
1. `supabase/functions/team-assistant/index.ts` — multimodal content parts + system prompt update
2. `src/lib/i18n/en.ts` — cập nhật labels
3. `src/lib/i18n/vi.ts` — cập nhật labels

## Không thay đổi
- DB, RLS, R2 storage, frontend upload UI, billing logic

