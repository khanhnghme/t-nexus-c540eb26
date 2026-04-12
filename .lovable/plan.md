

## Fix: URL `/pa/` dùng project slug thay vì page slug

### Vấn đề hiện tại
URL trang canvas là `/pa/ws-{wsShortId}/{pageSlug}` — hiển thị tên trang thay vì tên dự án, gây nhầm lẫn.

### Giải pháp
Đổi format thành `/pa/ws-{wsShortId}/{projectSlug}` — chỉ chứa tên dự án. Việc chọn trang nào sẽ do `CanvasPageView` xử lý nội bộ (mặc định trang đầu tiên).

### Thay đổi

| File | Nội dung |
|------|----------|
| **`src/App.tsx`** | Đổi route `/pa/:wsParam/:pageSlug` → `/pa/:wsParam/:projectSlug` |
| **`src/lib/urlUtils.ts`** | Cập nhật `getPageUrl(wsShortId, projectSlug)` → `/pa/ws-${wsShortId}/${projectSlug}` |
| **`src/pages/GroupDetail.tsx`** | Khi route `/pa/`, dùng `projectSlug` param để resolve group (query `groups` by slug thay vì query `project_pages`). Bỏ truyền `initialPageSlug` |
| **`src/components/canvas/CanvasPageView.tsx`** | Xóa tất cả navigate cập nhật URL khi chuyển trang — giữ URL cố định là `/pa/ws-{wsShortId}/{projectSlug}`. Bỏ prop `initialPageSlug` |
| **`src/components/LegacyRedirects.tsx`** | `LegacyPageRedirect` redirect sang `/pa/ws-{wsShortId}/{projectSlug}` (dùng project slug thay vì page slug) |

### Chi tiết kỹ thuật

**Route (App.tsx):**
```
/pa/:wsParam/:projectSlug    →  <GroupDetail />
```

**URL helper (urlUtils.ts):**
```typescript
export function getPageUrl(wsShortId: string, projectSlug: string): string {
  return `/pa/ws-${wsShortId}/${projectSlug}`;
}
```

**GroupDetail — resolve group từ projectSlug khi route `/pa/`:**
```typescript
// Thay vì query project_pages by pageSlug, query groups by slug trực tiếp
const { data } = await supabase.from('groups').select('*').eq('slug', projectSlug).single();
```

**CanvasPageView — bỏ navigate khi chuyển trang:**
- Khi chọn trang khác trong sidebar: chỉ `setActivePageId`, không `navigate`
- Khi tạo trang mới: chỉ `setActivePageId`, không `navigate`
- Khi đổi tên trang: không `navigate`

