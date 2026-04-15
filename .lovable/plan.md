

# Hệ thống Upload File cho AI + Giới hạn lưu trữ Chat

## Tổng quan
Cho phép user upload tối đa 5 file (mỗi file ≤5MB) kèm câu hỏi AI. Giới hạn tối đa 10 cuộc trò chuyện, tự động xóa chat + file cũ nhất khi vượt quá.

## Thay đổi

### 1. DB Migration
- Thêm bảng `ai_message_attachments`:
  ```
  id uuid PK
  message_id uuid FK → ai_messages(id) ON DELETE CASCADE
  file_path text NOT NULL
  file_name text NOT NULL
  file_size integer NOT NULL
  content_type text
  created_at timestamptz
  ```
- RLS: user chỉ truy cập attachment thuộc message của mình
- Tạo DB function `cleanup_old_ai_conversations(_user_id uuid, _max_conversations int DEFAULT 10)`:
  - Tìm conversation cũ nhất vượt quá limit (trừ pinned)
  - Trả về danh sách file_path cần xóa từ `ai_message_attachments`
  - Xóa conversation (CASCADE tự xóa messages + attachments)

### 2. R2 Storage — Bucket `ai-attachments`
- Thêm bucket mới `ai-attachments` vào `ALLOWED_BUCKETS` trong `r2-storage` EF
- Thêm `BUCKET_URL_KEYS` mapping cho `ai-attachments`
- Cập nhật `r2Storage.ts` client-side: thêm `'ai-attachments'` vào `ALL_BUCKETS`
- Cần user cung cấp secret `R2_URL_AI_ATTACHMENTS` (public URL cho bucket)

### 3. Edge Function `team-assistant` — Nhận file content
- Thêm field `attachments` trong request body (array of `{ file_path, file_name, content_type }`)
- Với mỗi file: download từ R2, extract text content (text/csv/json → đọc trực tiếp, PDF/docx → ghi nhận metadata)
- Append nội dung file vào user message cuối cùng dưới dạng context block
- Validate: max 5 attachments, tổng kích thước ≤ 25MB

### 4. Frontend `AIAssistant.tsx` — UI Upload
- Thêm state `pendingFiles: File[]`
- Nút attach (📎) bên cạnh input, mở file picker (multiple, max 5)
- Hiển thị preview chips (tên file + kích thước + nút xóa)
- Validate client-side: ≤5MB/file, ≤5 file
- Khi send: upload files lên R2 trước → gửi message với attachments metadata → lưu `ai_message_attachments`
- Sau khi tạo conversation mới: gọi cleanup function xóa chat cũ + file R2

### 5. Frontend `AIAssistantPanel.tsx` — Tương tự
- Thêm upload UI compact cho side panel
- Cùng logic upload + cleanup

### 6. Cleanup Logic (Client-side after send)
- Sau `ensureConversation()`, đếm số conversation hiện tại
- Nếu > 10: gọi RPC `cleanup_old_ai_conversations` → nhận danh sách file paths
- Xóa file từ R2 via `r2Storage.from('ai-attachments').remove(paths)`
- Conversation bị pin không bị xóa tự động

### 7. Hiển thị file trong chat history
- Khi load messages, fetch attachments kèm theo
- Hiển thị file chips dưới user message (tên file + icon theo loại)
- Không cần download lại file — chỉ hiển thị metadata

### 8. i18n labels (EN/VI)
```
aiAttachFiles: 'Attach files' / 'Đính kèm file'
aiMaxFiles: 'Maximum 5 files per message' / 'Tối đa 5 file mỗi tin nhắn'
aiMaxFileSize: 'Maximum 5MB per file' / 'Tối đa 5MB mỗi file'
aiFileTooLarge: 'File exceeds 5MB limit' / 'File vượt quá giới hạn 5MB'
aiTooManyFiles: 'Maximum 5 files allowed' / 'Tối đa 5 file'
aiOldChatsDeleted: 'Old conversations cleaned up' / 'Đã dọn dẹp cuộc trò chuyện cũ'
aiChatLimit: 'Only the 10 most recent conversations are kept' / 'Chỉ giữ 10 cuộc trò chuyện gần nhất'
```

## Thứ tự triển khai
1. DB migration (bảng + RPC cleanup)
2. R2 bucket setup + cập nhật r2-storage EF
3. Edge Function team-assistant (nhận attachments)
4. i18n labels
5. AIAssistant.tsx (upload UI + cleanup logic)
6. AIAssistantPanel.tsx (compact upload UI)

## Không thay đổi
- Billing / credit logic
- Existing conversation/message schema (chỉ thêm bảng mới)
- AI model routing logic

## Yêu cầu từ user
- Cung cấp R2 public URL cho bucket `ai-attachments` (secret `R2_URL_AI_ATTACHMENTS`)

