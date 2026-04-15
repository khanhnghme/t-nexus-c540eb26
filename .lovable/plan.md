

## Phân tích nguyên nhân & Giải pháp: Trang trắng 1-2s khi chuyển trang

### Nguyên nhân

Tất cả page trong app đều dùng `React.lazy()` (lazy-load). Khi chuyển trang, React cần tải chunk JS của trang mới. Hiện tại có **một `Suspense fallback={null}` duy nhất bọc toàn bộ Routes** (dòng 168 App.tsx):

```text
<Suspense fallback={null}>     ← bọc TẤT CẢ routes
  <Routes>
    <Route element={<ProtectedLayout />}>   ← sidebar + topbar
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/groups" element={<Groups />} />
      ...
    </Route>
  </Routes>
</Suspense>
```

Khi user click từ `/dashboard` → `/groups`, nếu chunk `Groups.tsx` chưa được cache:
1. React unmount `Dashboard`, cần load chunk `Groups`
2. Suspense bắt promise → render fallback = `null` → **toàn bộ trang (cả sidebar, topbar) biến mất**
3. Chunk load xong → render lại toàn bộ → trang hiện lại

Đây chính xác là nguyên nhân "trắng xóa 1-2s".

### Giải pháp

Thêm `<Suspense>` **bên trong DashboardLayout**, bọc quanh `<Outlet />`. Khi lazy component đang load, chỉ vùng nội dung chính hiển thị loading — sidebar và topbar giữ nguyên.

### Thay đổi

#### `src/components/layout/DashboardLayout.tsx`

Tại dòng 585, thay:
```tsx
{useOutlet ? <Outlet /> : children}
```

Thành:
```tsx
{useOutlet ? (
  <Suspense fallback={
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  }>
    <Outlet />
  </Suspense>
) : children}
```

Thêm import `Suspense` từ React ở đầu file.

### Kết quả

- Sidebar, topbar **luôn hiển thị** khi chuyển trang
- Chỉ vùng nội dung chính hiện spinner nhỏ trong khi chunk đang tải
- Không cần thay đổi routing hay lazy import

**1 file thay đổi. Không thêm dependencies.**

