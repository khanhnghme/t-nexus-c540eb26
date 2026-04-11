

## Phase 10 — Giai doan 4/4: Permission Check Nang Cao (RLS + Client)

### Muc tieu
Bo sung RLS policies cho `project_pages` de group members (project_member, project_admin, project_owner) co the doc/ghi dung quyen, va dam bao client-side logic khop voi server-side policies.

### Hien trang
- Stage 1-3 hoan thanh: toggle Edit/View, an UI elements, styling view mode
- RLS hien tai chi co 3 policies:
  - System admins SELECT all
  - Public groups SELECT cho anonymous
  - System admins ALL (full CRUD)
- **Thieu**: Group members (project_owner/admin/member/guest) khong co policy SELECT hoac INSERT/UPDATE/DELETE → ho khong the doc hoac chinh sua pages qua RLS

### Hanh dong

**1. Them RLS policies (database migration)**

| Policy | Operation | Dieu kien |
|--------|-----------|-----------|
| Group members can view pages | SELECT | User la member cua group (bat ky role) |
| Group leaders can manage pages | INSERT, UPDATE, DELETE | User co role `project_owner` hoac `project_admin` trong group |

```text
-- Group members (any role) can view pages of their groups
CREATE POLICY "Group members can view pages"
  ON public.project_pages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = project_pages.group_id
      AND gm.user_id = auth.uid()
  ));

-- Group leaders can insert/update/delete pages
CREATE POLICY "Group leaders can manage pages"
  ON public.project_pages FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = project_pages.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('project_owner', 'project_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = project_pages.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('project_owner', 'project_admin')
  ));
```

**2. Cap nhat `.lovable/plan.md`** — Danh dau Phase 10 hoan tat

### Khong lam
- Thay doi UI/component code (da xong o stage 1-3)
- Thay doi logic toggle/props

### Files thay doi

| File | Thay doi |
|------|----------|
| Migration SQL | Them 2 RLS policies cho group members |
| `.lovable/plan.md` | Phase 10 hoan tat |

