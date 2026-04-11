

## Tích hợp File Upload vào Canvas Editor qua R2 Storage

### Cách hoạt động

BlockNote hỗ trợ `uploadFile` callback trong `useCreateBlockNote`. Khi user kéo thả ảnh/file hoặc dùng slash menu (Image, Video, Audio, File), BlockNote gọi callback này và nhận lại URL để hiển thị.

### Thay đổi

#### 1. `src/components/canvas/CanvasEditor.tsx`

- Thêm `uploadFile` function vào config `useCreateBlockNote`:
  - Upload file lên R2 bucket `project-resources` với path `canvas/{groupId}/{pageId}/{timestamp}_{filename}`
  - Sau khi upload thành công, INSERT record vào `project_resources` với:
    - `group_id`, `uploaded_by` (user.id)
    - `name`: tên file gốc
    - `file_path`: public URL từ R2
    - `storage_name`: R2 path
    - `file_size`: file.size (bytes) → tự động tính vào storage quota qua `get_account_storage_usage()`
    - `file_type`: file.type
    - `category`: `'canvas-attachment'`
    - `resource_type`: `'file'`
  - Trả về public URL cho BlockNote hiển thị
- Nhận thêm prop `userId` từ `CanvasPageView` (hoặc dùng `useAuth` trực tiếp trong editor)
- Import `r2Storage` và `supabase`

#### 2. `src/components/canvas/CanvasPageView.tsx`

- Khi xóa page (`handleDeletePage`), thêm cleanup:
  - Query `project_resources` WHERE `group_id = groupId` AND `category = 'canvas-attachment'` AND `storage_name LIKE 'canvas/{groupId}/{pageId}/%'`
  - Xóa files trên R2 và xóa records trong DB

### Không cần migration
- Bảng `project_resources` đã có đủ cột (`file_size`, `storage_name`, `category`, `file_type`)
- `get_account_storage_usage()` đã tính `project_resources.file_size` → dung lượng tự động cộng vào tổng

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/CanvasEditor.tsx` | Thêm `uploadFile` handler với R2 + ghi `project_resources` |
| `src/components/canvas/CanvasPageView.tsx` | Cleanup canvas attachments khi xóa page |

