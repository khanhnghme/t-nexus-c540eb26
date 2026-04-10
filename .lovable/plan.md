

## Tích hợp Google Drive Picker — Chọn file từ Drive

### Tổng quan
Cho phép người dùng chọn file từ Google Drive thông qua Google Picker API, lưu link reference vào hệ thống (không upload file). Tích hợp vào flow nộp bài hiện tại như "Cách 3" bên cạnh Upload file và Dán link.

### Kiến trúc hiện tại
- Hệ thống đã có Google OAuth với 2 client riêng (Auth + Calendar)
- Nộp bài lưu dưới dạng JSON trong `submission_link` column, mỗi item có `type: 'link' | 'file'`
- Sẽ thêm `type: 'drive'` cho file từ Google Drive

---

### GIAI ĐOẠN 1: TECHNICAL FOUNDATION

#### 1.1 OAuth — Tạo Google Drive Client riêng (tương tự Calendar)
- Tạo Google OAuth Client ID thứ 3 dành riêng cho Drive (tách biệt khỏi Auth/Calendar)
- Scope tối thiểu: `https://www.googleapis.com/auth/drive.readonly` (chỉ đọc metadata + xem file)
- Secrets cần thêm: `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`
- Lưu token vào bảng mới `google_drive_tokens` (cấu trúc giống `google_calendar_tokens`)

#### 1.2 Edge Functions (theo pattern Calendar)
- **`google-drive-auth/index.ts`**: Tạo OAuth URL với state=userId, redirect tới callback
- **`google-drive-callback/index.ts`**: Exchange code → tokens, lưu vào `google_drive_tokens`
- **`google-drive-picker-token/index.ts`**: Trả về access_token hợp lệ (tự refresh nếu hết hạn) để frontend dùng cho Picker API

#### 1.3 Google Picker API (client-side)
- Load Google Picker JS library (`https://apis.google.com/js/api.js`)
- Dùng access_token từ edge function để init Picker
- Picker config: cho phọn multiple files, hiển thị tất cả file types
- Khi user chọn file, lấy: `fileId`, `name`, `mimeType`, `url` (webViewLink), `iconUrl`, `sizeBytes`

#### 1.4 Lưu trữ dữ liệu
- Không cần bảng mới cho file references — lưu trực tiếp trong `submission_link` JSON hiện tại
- Format item mới:
```json
{
  "type": "drive",
  "title": "Báo cáo cuối kỳ.pdf",
  "url": "https://drive.google.com/file/d/xxx/view",
  "drive_file_id": "xxx",
  "mime_type": "application/pdf",
  "icon_url": "https://...",
  "file_size": 1234567
}
```

#### 1.5 Database Migration
- Tạo bảng `google_drive_tokens` (user_id, access_token, refresh_token, expires_at)
- RLS: user chỉ đọc/sửa token của mình

#### 1.6 Xử lý lỗi & bảo mật
- Token hết hạn → auto refresh trong edge function trước khi trả về
- File bị xóa/không quyền → khi mở link sẽ thấy lỗi từ Google (acceptable, không cần check runtime)
- Không lưu file content, chỉ lưu metadata reference

---

### GIAI ĐOẠN 2: UI/UX DESIGN

#### 2.1 Kết nối Drive (component `GoogleDriveConnect`)
- Tương tự `GoogleCalendarConnect` — nút "Liên kết Google Drive"
- Sau khi kết nối: hiển thị tag xanh "Đã liên kết" + dropdown hủy liên kết có xác nhận
- Đặt trong Settings hoặc hiện inline khi lần đầu chọn "Google Drive"

#### 2.2 TaskSubmissionDialog — Thêm "Cách 3: Google Drive"
- Thêm tab/section thứ 3 bên cạnh "Upload file" và "Dán link"
- Icon Google Drive + text "Chọn từ Google Drive"
- Nếu chưa liên kết → hiện nút kết nối inline
- Nếu đã liên kết → click mở Google Picker overlay

#### 2.3 File đã chọn từ Drive
- Hiển thị tương tự file upload: icon theo mimeType, tên file, dung lượng
- Badge nhỏ "Drive" để phân biệt với file upload thường
- Nút: Preview (mở link Drive), Xóa (remove khỏi danh sách)
- Không có rename (tên từ Drive)

#### 2.4 States
- **Loading**: Spinner khi đang mở Picker hoặc lấy token
- **Error**: Toast khi token hết hạn / không kết nối được
- **Success**: File xuất hiện ngay trong danh sách sau khi chọn

#### 2.5 Hiển thị trong lịch sử nộp bài
- File Drive hiện với icon Drive + link mở trực tiếp
- Cùng format với link thường nhưng có badge "Google Drive"

---

### Files cần tạo/sửa

| File | Hành động |
|------|-----------|
| `supabase/functions/google-drive-auth/index.ts` | Tạo mới |
| `supabase/functions/google-drive-callback/index.ts` | Tạo mới |
| `supabase/functions/google-drive-picker-token/index.ts` | Tạo mới |
| `src/hooks/useGoogleDriveConnect.ts` | Tạo mới |
| `src/components/drive/GoogleDriveConnect.tsx` | Tạo mới |
| `src/components/drive/GoogleDrivePicker.tsx` | Tạo mới |
| `src/components/TaskSubmissionDialog.tsx` | Sửa — thêm Cách 3 |
| `src/components/SubmissionButton.tsx` | Sửa — hiển thị Drive items |
| Database migration | Tạo bảng `google_drive_tokens` |
| Secrets | Thêm `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET` |

### Yêu cầu từ bạn trước khi triển khai
- Tạo Google OAuth Client ID mới cho Drive trong Google Cloud Console (cùng project với Calendar)
- Cung cấp Client ID và Client Secret để lưu vào secrets

