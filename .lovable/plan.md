

## Phase 12 — Giai đoạn 2/4: Cập nhật Service/Hooks hỗ trợ cover_url

### Mục tiêu
Cập nhật `updatePage` service để chấp nhận `cover_url` parameter, cho phép client code lưu/xóa cover image cho page.

### Hiện trạng
- Giai đoạn 1 hoàn thành: cột `cover_url` đã có trong DB
- `updatePage()` trong `projectPages.ts` chỉ chấp nhận `title`, `content`, `display_order`, `icon` — chưa có `cover_url`
- Hook `useUpdatePage` đã hoạt động, chỉ cần mở rộng type

### Hành động

**1. Cập nhật `updatePage` trong service**

Thêm `cover_url?: string | null` vào type parameter của hàm `updatePage`:

```typescript
export async function updatePage(pageId: string, updates: {
  title?: string;
  content?: any;
  display_order?: number;
  icon?: string | null;
  cover_url?: string | null;  // <-- thêm dòng này
}) {
```

Không cần thay đổi logic bên trong vì đã dùng spread `...updates`.

**2. Thêm handler `handleChangeCover` trong `CanvasPageView.tsx`**

Thêm hàm xử lý tương tự `handleChangePageIcon`:

```typescript
const handleChangeCover = async (pageId: string, coverUrl: string | null) => {
  try {
    await updatePage.mutateAsync({ pageId, updates: { cover_url: coverUrl } });
  } catch (err: any) {
    toast.error(err.message || "Không thể thay đổi cover.");
  }
};
```

Chưa truyền xuống component nào (giai đoạn 3 sẽ làm UI).

### Không làm
- UI hiển thị/upload cover (giai đoạn 3)
- Preset gradients (giai đoạn 3)
- Storage bucket cho upload ảnh (giai đoạn 3)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/services/projectPages.ts` | Thêm `cover_url` vào type của `updatePage` |
| `src/components/canvas/CanvasPageView.tsx` | Thêm `handleChangeCover` handler |

