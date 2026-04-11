

## Phase 16 — Template System cho Custom Projects

### Mục tiêu
Cho phép user tạo custom project từ template có sẵn (thay vì blank canvas), và lưu project hiện tại thành template để tái sử dụng.

### Hiện trạng
- Bảng `project_templates` chưa tồn tại
- `CreateCustomProject.tsx` luôn tạo project blank (1 page rỗng)
- Chưa có UI chọn template hay "Save as template"

### Công việc

**1. Migration — Tạo bảng `project_templates`**

```sql
CREATE TABLE public.project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '[]',
  category TEXT NOT NULL DEFAULT 'general',
  icon TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

-- System templates visible to all authenticated users
CREATE POLICY "Anyone can view system templates"
  ON public.project_templates FOR SELECT TO authenticated
  USING (is_system = true);

-- User templates visible within same workspace
CREATE POLICY "Workspace members can view workspace templates"
  ON public.project_templates FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- Only creator can insert/update/delete their templates
CREATE POLICY "Users can manage own templates"
  ON public.project_templates FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
```

Seed 3 system templates: "Sprint Planning", "Meeting Notes", "Research Project" với content JSONB mẫu (headings + task block + note block).

**2. Tạo `TemplatePicker.tsx`**

Component dialog/modal hiển thị khi tạo custom project:
- Grid cards: "Blank" + các templates từ DB
- Mỗi card: icon, name, description, preview snippet
- Fetch templates: system templates + workspace templates
- Chọn template → trả về content JSONB để hydrate editor

**3. Cập nhật `CreateCustomProject.tsx`**

- Thêm bước chọn template trước khi vào editor
- Flow: Chọn template → pre-fill editor với template content → user chỉnh sửa → tạo project
- Nếu chọn "Blank" → giữ nguyên behavior hiện tại

**4. Tạo `SaveAsTemplateDialog.tsx`**

- Button "Lưu làm template" trong page header hoặc menu
- Dialog: nhập tên, mô tả, chọn category
- Lấy toàn bộ content JSONB từ page hiện tại → insert vào `project_templates`
- Chỉ hiện cho project_admin/owner

**5. Tích hợp vào `CanvasPageView.tsx`**

- Thêm menu action "Lưu làm template" cho admin
- Gọi `SaveAsTemplateDialog` với content hiện tại

### Files thay đổi

| File | Thay đổi |
|------|----------|
| Migration SQL | Tạo bảng `project_templates` + RLS + seed system templates |
| `src/components/canvas/TemplatePicker.tsx` | Mới — grid chọn template |
| `src/components/canvas/SaveAsTemplateDialog.tsx` | Mới — dialog lưu template |
| `src/pages/CreateCustomProject.tsx` | Thêm bước chọn template |
| `src/components/canvas/CanvasPageView.tsx` | Thêm action "Lưu làm template" |

### Không làm
- Template marketplace / sharing giữa workspaces
- Template versioning
- Template preview với full editor render

