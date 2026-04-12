

## Fix: Cải thiện kiểm tra giới hạn upload trong Canvas Page

### Hiện trạng
- ✅ Server-side (edge function `r2-storage`): Đã kiểm tra `max_file_size_mb` theo plan → trả 413 nếu vượt
- ❌ Client-side (`CanvasEditor.tsx`): Không parse lỗi 413, không hiển thị thông báo cụ thể
- ❌ Không kiểm tra read-only guard trước khi upload
- ❌ Không kiểm tra tổng storage quota trước upload

### Thay đổi

**File: `src/components/canvas/CanvasEditor.tsx`**

1. Import `useReadOnlyGuard` và `useAccountLimitsCheck`
2. Trong `uploadFile`:
   - Kiểm tra `isReadOnly` → chặn ngay + toast cảnh báo
   - Gọi `r2Storage.from().upload()` như cũ
   - Parse response error: nếu message chứa "File quá lớn" hoặc HTTP 413 → hiển thị toast chi tiết với thông tin giới hạn plan thay vì lỗi chung
3. Cập nhật `r2Storage.ts` upload method để trả thêm HTTP status code trong error object, giúp client phân biệt 413 vs lỗi khác

**File: `src/lib/r2Storage.ts`**

Sửa hàm `upload()`:
```ts
if (!response.ok) {
  return { 
    data: null, 
    error: { message: result.error || 'Upload failed', status: response.status } 
  };
}
```

**File: `src/components/canvas/CanvasEditor.tsx`**

Sửa hàm `uploadFile`:
```ts
// Check read-only before upload
if (isReadOnly) {
  toast.error(isVi ? 'Tài khoản chỉ đọc...' : 'Read-only account...');
  throw new Error('Read-only');
}

const { data, error } = await r2Storage.from("project-resources").upload(r2Path, file, {...});
if (error) {
  // Show detailed plan limit message if available
  toast.error(error.message);
  throw new Error(error.message);
}
```

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/lib/r2Storage.ts` | Trả thêm `status` trong error object |
| `src/components/canvas/CanvasEditor.tsx` | Thêm read-only guard + parse lỗi 413 chi tiết |

