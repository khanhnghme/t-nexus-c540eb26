

## Phase 1 — Giai đoạn 2/4: RLS Review & Bổ sung cho Project Pages

### Mục tiêu
Review và bổ sung RLS policies cho `project_pages` để hỗ trợ đầy đủ các use case của Canvas Editor (public view, system admin, workspace visibility).

### Hiện trạng RLS đã có
- ✅ `SELECT`: `is_group_member(auth.uid(), group_id)` — Members xem được
- ✅ `INSERT`: `is_group_leader(auth.uid(), group_id)` — Leaders tạo được
- ✅ `UPDATE`: `is_group_leader(auth.uid(), group_id)` — Leaders sửa được
- ✅ `DELETE`: `is_group_leader(auth.uid(), group_id)` — Leaders xóa được

### Thiếu sót cần bổ sung
1. **System admins** không xem được project pages (không có policy cho `is_admin`/`is_system_admin`)
2. **Public groups** — nếu project public (`is_public = true`), anonymous users không xem được pages
3. **Workspace visibility** — project với `visibility = 'workspace_public'` cần workspace members xem được

### Hành động cụ thể

**Database Migration — Thêm 3 SELECT policies:**

```sql
-- 1. System admins có thể xem tất cả project pages
CREATE POLICY "System admins can view all project pages"
  ON public.project_pages FOR SELECT
  TO authenticated
  USING (is_system_admin(auth.uid()));

-- 2. Public groups: anonymous users có thể xem pages
CREATE POLICY "Public can view pages of public groups"
  ON public.project_pages FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = project_pages.group_id
      AND g.is_public = true
  ));

-- 3. System admins can manage (ALL) for troubleshooting
CREATE POLICY "System admins can manage project pages"
  ON public.project_pages FOR ALL
  TO authenticated
  USING (is_system_admin(auth.uid()))
  WITH CHECK (is_system_admin(auth.uid()));
```

### Output
- System admins có full access vào project pages
- Public groups cho phép anonymous xem pages (cần cho share link)
- Không ảnh hưởng policies hiện tại (chỉ thêm, không sửa/xóa)

### Rủi ro
- Policy `is_system_admin` ALL sẽ overlap với leader policies — Postgres dùng OR giữa các permissive policies nên không conflict
- Public SELECT policy phụ thuộc vào `groups.is_public` — đã là pattern có sẵn trong hệ thống (giống `group_members`, `activity_logs`)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| Migration SQL | Thêm 3 RLS policies cho `project_pages` |

