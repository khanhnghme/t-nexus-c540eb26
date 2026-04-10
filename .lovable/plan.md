

## Giai đoạn 2: Frontend UI — Gmail Tab trong trang Thông báo

### Tổng quan
Tạo hook, 2 components mới, cập nhật trang Notifications thêm tab "Email", và thêm translations.

### Chi tiết triển khai

#### 1. `src/hooks/useGmailSync.ts`
Hook quản lý kết nối Gmail, pattern giống `useGoogleCalendarSync.ts`:
- State: `isConnected`, `isSyncing`, `isChecking`, `connectedEmail`
- `checkConnection()` — gọi edge function `gmail-sync` với action `status`
- `connect()` — gọi `gmail-auth` → redirect tới Google OAuth
- `disconnect()` — gọi `gmail-sync` action `disconnect`
- `syncEmails()` — gọi `gmail-sync` action `sync`
- Kiểm tra URL params `?gmail=connected|error` khi callback redirect về

#### 2. `src/components/notifications/GmailConnect.tsx`
Nút kết nối/ngắt Gmail hiển thị trong header khi tab Email active:
- Chưa kết nối: nút "Kết nối Gmail" với icon Mail
- Đã kết nối: hiển thị email address + nút Sync + nút Disconnect

#### 3. `src/components/notifications/GmailTab.tsx`
Component hiển thị danh sách email từ bảng `gmail_messages`:
- Fetch từ Supabase trực tiếp (đã có RLS)
- Hiển thị: subject, from_name/from_email, snippet, received_at, badge đọc/chưa đọc
- Nhóm theo ngày (reuse hàm `groupByDate` pattern)
- Empty state khi chưa kết nối (hiển thị `GmailConnect`)
- Empty state khi đã kết nối nhưng chưa có email
- Nút "Sync now" trong header

#### 4. Cập nhật `src/pages/Notifications.tsx`
- Thêm tab "Email" (icon `Mail`) vào TabsList hiện có, cạnh All/Unread/Read
- Khi tab = 'email': ẩn workspace filter, ẩn notification content → render `GmailTab`
- Khi tab != 'email': giữ nguyên logic hiện tại
- Cập nhật type `TabFilter` thêm `'email'`

#### 5. Cập nhật `gmail-callback/index.ts`
- Redirect về `/notifications?gmail=connected` thay vì `/` (hiện tại chưa rõ redirect URL)

#### 6. Translations
Thêm keys vào `src/lib/i18n/vi.ts` và `en.ts`:
- `gmail.connectGmail`, `gmail.disconnectGmail`, `gmail.syncNow`, `gmail.syncing`, `gmail.connected`, `gmail.notConnected`, `gmail.noEmails`, `gmail.connectDesc`, `gmail.syncSuccess`, `gmail.syncError`, `gmail.tabEmail`

### Files cần tạo/sửa
- **Tạo**: `src/hooks/useGmailSync.ts`, `src/components/notifications/GmailConnect.tsx`, `src/components/notifications/GmailTab.tsx`
- **Sửa**: `src/pages/Notifications.tsx`, `supabase/functions/gmail-callback/index.ts`, `src/lib/i18n/vi.ts`, `src/lib/i18n/en.ts`

