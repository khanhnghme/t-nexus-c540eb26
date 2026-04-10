

## Tích hợp Gmail API - Chia 2 Giai đoạn

---

### Giai đoạn 1: Database + Edge Functions (Backend)

**1.1. Secrets** -- Cần tạo 2 secret mới:
- `GOOGLE_GMAIL_CLIENT_ID`
- `GOOGLE_GMAIL_CLIENT_SECRET`

User cần tạo OAuth Client ID mới trong Google Cloud Console (tách biệt khỏi Calendar & Login), bật Gmail API, và thêm redirect URI: `https://xrlczmzgxlmdavhbwsah.supabase.co/functions/v1/gmail-callback`

**1.2. Database Migration** -- Tạo 2 bảng:

- **`google_gmail_tokens`**: `id (uuid PK)`, `user_id (uuid, refs auth.users, unique)`, `access_token (text)`, `refresh_token (text)`, `expires_at (timestamptz)`, `email_address (text)`, `created_at`, `updated_at`
  - RLS: user chỉ SELECT/DELETE row của mình

- **`gmail_messages`**: `id (uuid PK)`, `user_id (uuid)`, `gmail_message_id (text, unique per user)`, `thread_id (text)`, `subject (text)`, `snippet (text)`, `from_email (text)`, `from_name (text)`, `received_at (timestamptz)`, `is_read (boolean)`, `labels (text[])`, `created_at`
  - RLS: user chỉ SELECT row của mình

**1.3. Edge Functions** -- Tạo 3 function (pattern giống google-calendar-*):

- **`gmail-auth`**: Tạo Google OAuth URL với scope `gmail.readonly`, state = userId, redirect về `gmail-callback`
- **`gmail-callback`**: Nhận authorization code từ Google, exchange lấy tokens, lưu vào `google_gmail_tokens`, redirect user về app
- **`gmail-sync`**: Hỗ trợ 3 action (`status`, `sync`, `disconnect`). Khi sync: fetch 50 email mới nhất từ Gmail API, upsert vào `gmail_messages`

---

### Giai đoạn 2: Frontend UI (Chi tiết)

**2.1. Hook** -- `src/hooks/useGmailSync.ts`
- Quản lý trạng thái kết nối Gmail (connected/disconnected)
- Các hàm: `connect()`, `disconnect()`, `syncEmails()`, `checkStatus()`
- Pattern tương tự `useGoogleCalendarSync`

**2.2. Components mới**

- **`src/components/notifications/GmailConnect.tsx`**: Nút "Kết nối Gmail" / "Ngắt kết nối", hiển thị email đã kết nối
- **`src/components/notifications/GmailTab.tsx`**: Danh sách email với subject, from, snippet, thời gian, badge đã đọc/chưa đọc. Nút sync thủ công. Empty state khi chưa kết nối

**2.3. Cập nhật `src/pages/Notifications.tsx`**
- Thêm tab "Email" (icon Mail) cạnh các tab All/Unread/Read hiện có
- Khi chọn tab Email → render `GmailTab`
- Thêm nút kết nối Gmail vào header khi ở tab Email

**2.4. Cập nhật translations**
- Thêm key dịch cho Gmail tab trong cả tiếng Việt và tiếng Anh

---

### Thứ tự triển khai
1. Yêu cầu user nhập 2 secrets (`GOOGLE_GMAIL_CLIENT_ID`, `GOOGLE_GMAIL_CLIENT_SECRET`)
2. **Giai đoạn 1**: Tạo migration + 3 edge functions → deploy + test bằng curl
3. **Giai đoạn 2**: Tạo hook, components, cập nhật Notifications page + translations

