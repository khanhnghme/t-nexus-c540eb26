

## Phase 13 — Routing & Navigation cho Custom Projects

### Mục tiêu
URL đẹp cho từng page trong custom project, breadcrumb navigation, và deep-link trực tiếp đến page cụ thể.

### Hiện trạng đã có
- `project_pages.slug` column + unique index per group đã tồn tại
- Trigger `trg_project_pages_slug` auto-generate slug khi INSERT
- Route `/p/:projectSlug` đã render `GroupDetail` → `CanvasPageView`
- `CanvasPageView` dùng `activePageId` state nội bộ, chưa sync với URL
- Breadcrumb component UI đã có sẵn (`src/components/ui/breadcrumb.tsx`)

### Công việc

**1. Thêm route mới cho page slug**

Trong `App.tsx`, thêm route:
```
/p/:projectSlug/page/:pageSlug → GroupDetail
```
`GroupDetail` sẽ đọc `pageSlug` param và truyền xuống `CanvasPageView`.

**2. Cập nhật `GroupDetail.tsx`**

- Đọc `pageSlug` từ `useParams()`
- Truyền `pageSlug` xuống `CanvasPageView` qua prop mới
- Thay header cứng bằng **Breadcrumb**: Workspace > Project name > Page name

**3. Cập nhật `CanvasPageView.tsx`**

- Nhận prop `initialPageSlug?: string`
- Khi có `initialPageSlug`: tìm page matching slug → set `activePageId`
- Khi user chuyển page: dùng `navigate()` để update URL thành `/p/:projectSlug/page/:pageSlug`
- Khi không có `pageSlug` (URL cũ `/p/:projectSlug`): auto-redirect đến page đầu tiên

**4. Cập nhật `CanvasSidebar.tsx`**

- Click page trong sidebar → navigate URL thay vì chỉ set state
- Active page highlight dựa trên URL param

**5. Đảm bảo slug update khi rename page**

- Khi user đổi title page → gọi update slug (hoặc tạo trigger BEFORE UPDATE tương tự INSERT)
- Migration: thêm trigger cho UPDATE nếu chưa có

### Migration cần thiết

```sql
-- Trigger auto-generate slug on UPDATE (title change)
CREATE OR REPLACE FUNCTION public.generate_page_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.title IS DISTINCT FROM OLD.title) THEN
    NEW.slug := public.generate_vietnamese_slug(NEW.title);
    -- Handle duplicates within same group
    IF EXISTS (
      SELECT 1 FROM public.project_pages 
      WHERE group_id = NEW.group_id AND slug = NEW.slug AND id != NEW.id
    ) THEN
      NEW.slug := NEW.slug || '-' || substr(NEW.id::text, 1, 4);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for UPDATE
DROP TRIGGER IF EXISTS trg_project_pages_slug ON public.project_pages;
CREATE TRIGGER trg_project_pages_slug
  BEFORE INSERT OR UPDATE ON public.project_pages
  FOR EACH ROW EXECUTE FUNCTION public.generate_page_slug();

-- Backfill existing pages without slugs
UPDATE public.project_pages SET slug = public.generate_vietnamese_slug(title) WHERE slug IS NULL;
```

### Files thay đổi

| File | Thay đổi |
|------|----------|
| Migration SQL | Trigger UPDATE + backfill slugs |
| `src/App.tsx` | Thêm route `/p/:projectSlug/page/:pageSlug` |
| `src/pages/GroupDetail.tsx` | Đọc `pageSlug`, truyền xuống, thêm breadcrumb |
| `src/components/canvas/CanvasPageView.tsx` | Sync activePageId với URL, navigate khi chuyển page |
| `src/components/canvas/CanvasSidebar.tsx` | Click page → navigate URL |
| `src/hooks/useProjectPages.ts` | Đảm bảo query trả về `slug` field |

### Không làm
- Public page view (Phase 18)
- SEO meta tags
- Page nesting / sub-pages

