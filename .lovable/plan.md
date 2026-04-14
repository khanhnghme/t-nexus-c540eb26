

## Plan: Thêm trang Tìm kiếm toàn diện (Global Search)

Tạo trang `/search` riêng biệt với khả năng tìm kiếm "siêu chi tiết" xuyên suốt toàn bộ dữ liệu trong hệ thống, đặt ngay dưới mục "Trang chủ" trên thanh điều hướng.

### Tính năng tìm kiếm

- **Dự án**: tìm theo tên, mô tả, mã lớp
- **Nhiệm vụ (Tasks)**: tìm theo tiêu đề, mô tả, trạng thái
- **Thành viên**: tìm theo tên, email
- **Tài nguyên (Resources)**: tìm theo tên file
- **Lịch & Cuộc họp**: tìm theo tiêu đề
- **Feedback**: tìm theo tiêu đề, nội dung

Kết quả được phân loại theo tab, có highlight từ khóa, click để đi thẳng đến trang chi tiết.

### Chi tiết kỹ thuật

**1. Tạo file `src/pages/Search.tsx`**
- Input tìm kiếm lớn ở đầu trang (autofocus)
- Debounce 300ms trước khi query
- Tabs phân loại: Tất cả / Dự án / Nhiệm vụ / Thành viên / Tài nguyên / Cuộc họp / Feedback
- Mỗi tab query Supabase bằng `.ilike()` hoặc `.textSearch()` trên các bảng tương ứng
- Hiển thị kết quả dạng card nhỏ, có icon + highlight keyword + link navigate
- Empty state khi chưa nhập hoặc không có kết quả
- Loading skeleton khi đang tìm

**2. Cập nhật `src/App.tsx`**
- Import `Search` page
- Thêm route `/search` trong protected layout (cạnh `/dashboard`)

**3. Cập nhật `src/components/SidebarTreeNav.tsx`**
- Thêm link `/search` với icon `Search` ngay dưới Home (cả expanded và collapsed mode)

**4. Cập nhật i18n** (`src/lib/i18n/en.ts` + `vi.ts`)
- EN: `search: 'Search'` trong sidebar
- VI: `search: 'Tìm kiếm'` trong sidebar  
- Thêm section translations cho trang Search (placeholder, tab labels, empty states)

### Tổng cộng: 4 files thay đổi + 1 file mới

