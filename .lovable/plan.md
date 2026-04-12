

## Thêm chức năng tải ảnh lên làm Cover trong CoverPicker

### Vấn đề
CoverPicker hiện chỉ hỗ trợ gradient, màu đơn, và URL ảnh. Không có tab upload file ảnh trực tiếp.

### Giải pháp
Thêm tab "Tải ảnh" vào CoverPicker, cho phép chọn file ảnh → upload lên R2 bucket `project-resources` → trả về URL public làm cover.

### Thay đổi

| File | Nội dung |
|------|----------|
| **`src/components/canvas/CoverPicker.tsx`** | Thêm tab "Tải ảnh" với input file, upload lên R2, trả URL về `onSelect` |

### Chi tiết — `CoverPicker.tsx`

1. **Import thêm**: `r2Storage`, `getR2FilePublicUrl` từ `@/lib/r2Storage`, `Upload` icon, `useAuth`, `toast`, `Loader2`
2. **Nhận thêm prop `groupId`** để tạo path lưu trữ: `covers/{groupId}/{timestamp}-{filename}`
3. **Thêm tab thứ 4** `"upload"` — label "Tải ảnh":
   - Input file ẩn, accept `image/*`
   - Nút "Chọn ảnh từ máy" trigger input
   - Khi chọn file → upload lên R2 → gọi `onSelect(publicUrl)` → đóng popover
   - Hiển thị loading spinner khi đang upload
4. **Giới hạn**: chỉ nhận file ảnh, tối đa 5MB

### Cập nhật nơi sử dụng

| File | Nội dung |
|------|----------|
| **`src/components/canvas/PageHeader.tsx`** | Truyền `groupId` vào `CoverPicker` |
| **`src/components/canvas/PageCoverImage.tsx`** | Truyền `groupId` vào `CoverPicker` |
| **`src/components/canvas/CanvasPageView.tsx`** | Truyền `groupId` xuống `PageHeader` và `PageCoverImage` |

### Code mẫu — Tab upload trong CoverPicker

```tsx
<TabsTrigger value="upload" className="text-xs">Tải ảnh</TabsTrigger>

<TabsContent value="upload" className="mt-2">
  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
  <Button variant="outline" size="sm" className="w-full h-9 text-xs gap-1.5"
    onClick={() => fileRef.current?.click()} disabled={uploading}>
    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
    {uploading ? "Đang tải..." : "Chọn ảnh từ máy"}
  </Button>
</TabsContent>
```

Upload logic: dùng `r2Storage.from('project-resources').upload(path, file)` → `getR2FilePublicUrl('project-resources', path)`.

