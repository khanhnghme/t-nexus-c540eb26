

## Nâng cấp Gmail Tab: Phân trang + Tối ưu tốc độ

### Vấn đề hiện tại
- Fetch tất cả 50 email cùng lúc, không phân trang
- Edge function fetch từng email tuần tự (50 request nối tiếp) → chậm
- Không có tổng số email để phân trang

### Thay đổi

#### 1. Edge Function `gmail-sync/index.ts` — Batch request song song
- Thay vì fetch tuần tự từng message detail, dùng `Promise.all` với batch 10 request song song (5 batch x 10 = 50 messages)
- Giảm thời gian sync từ ~25s xuống ~5s

#### 2. Frontend `GmailTab.tsx` — Phân trang 15 email/trang
- Thêm state `currentPage` (default 1), `PAGE_SIZE = 15`
- Thay đổi `fetchEmails` để query với `.range(from, to)` thay vì `.limit(50)`, kèm count tổng số email (`{ count: 'exact' }`)
- Hiển thị pagination controls (Previous / Page numbers / Next) ở cuối danh sách
- Giữ nguyên date grouping nhưng chỉ group emails của trang hiện tại
- Reset về trang 1 khi sync xong

#### 3. Files cần sửa
- **`supabase/functions/gmail-sync/index.ts`**: Đổi vòng for tuần tự thành batch `Promise.all` (10 concurrent)
- **`src/components/notifications/GmailTab.tsx`**: Thêm pagination state, query with range + count, pagination UI dùng component `Pagination` có sẵn

