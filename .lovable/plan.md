

## Phase 1 — Giai đoạn 1/4: Database & Types Setup

### Mục tiêu
Đảm bảo database sẵn sàng cho Canvas Editor. Bảng `project_pages` đã tồn tại nhưng cần bổ sung và đồng bộ types.

### Hiện trạng
- ✅ Bảng `project_pages` đã có: `id`, `group_id`, `title`, `content` (JSONB), `display_order`, `created_by`, `icon`, timestamps
- ✅ RLS đã bật: Leaders CRUD, Members SELECT
- ❌ `project_pages` chưa có trong `src/integrations/supabase/types.ts` (auto-generated)
- ❌ Thiếu cột `slug` (cần cho routing sau này — Phase 13, nhưng thêm sớm để không phải migration lại)

### Hành động cụ thể

**1. Database Migration**

```sql
-- Thêm cột slug cho project_pages (chuẩn bị cho routing)
ALTER TABLE public.project_pages 
  ADD COLUMN IF NOT EXISTS slug text;

-- Unique slug per group
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_pages_group_slug 
  ON public.project_pages(group_id, slug) 
  WHERE slug IS NOT NULL;

-- Auto-generate slug từ title khi insert
CREATE OR REPLACE FUNCTION public.generate_page_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]', '-', 'g'));
    -- Đảm bảo unique trong group
    WHILE EXISTS (
      SELECT 1 FROM public.project_pages 
      WHERE group_id = NEW.group_id AND slug = NEW.slug AND id != NEW.id
    ) LOOP
      NEW.slug := NEW.slug || '-' || substr(gen_random_uuid()::text, 1, 4);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_project_pages_slug
  BEFORE INSERT ON public.project_pages
  FOR EACH ROW EXECUTE FUNCTION public.generate_page_slug();
```

**2. Types sync**
- Sau migration, types.ts sẽ được auto-regenerated bởi hệ thống, bao gồm `project_pages` table interface.

### Output
- Bảng `project_pages` có thêm cột `slug` + unique index + auto-generate trigger
- Types file được cập nhật tự động với `project_pages` interface
- Sẵn sàng cho Giai đoạn 2 (RLS review) → Giai đoạn 3-4 (UI)

### Rủi ro
- Trigger `generate_page_slug` chỉ xử lý INSERT, không xử lý UPDATE title → chấp nhận ở giai đoạn này, bổ sung sau nếu cần
- Slug generation đơn giản (regex replace) — đủ dùng cho MVP, không cần thư viện slugify phức tạp

### Files thay đổi

| File | Thay đổi |
|------|----------|
| Migration SQL | Thêm cột `slug`, unique index, trigger auto-slug |

