

## Phase 1 — Block Editor Core: Giai đoạn 1/2 (Database / Logic)

Theo nguyên tắc triển khai, Phase 1 chia thành 2 giai đoạn. Đây là **giai đoạn 1: Database / Logic**.

### Thay đổi

**1. Database Migration**

Thêm cột `project_mode` vào bảng `groups` và tạo bảng `project_pages`:

```text
groups
└── project_mode TEXT DEFAULT 'basic'   ← 'basic' | 'custom'

project_pages (NEW)
├── id          UUID PK
├── group_id    UUID FK → groups(id) ON DELETE CASCADE
├── title       TEXT DEFAULT 'Untitled'
├── content     JSONB DEFAULT '[]'   ← BlockNote JSON blocks
├── display_order INTEGER DEFAULT 0
├── created_by  UUID FK → auth.users(id)
├── created_at  TIMESTAMPTZ
├── updated_at  TIMESTAMPTZ
```

**2. RLS Policies cho `project_pages`**
- **SELECT**: project members (`is_group_member`)
- **INSERT/UPDATE**: project leaders (`is_project_leader`)
- **DELETE**: project leaders

**3. Cập nhật `Groups.tsx` — Thêm mode selector**
- Thêm state `projectMode` (`'basic' | 'custom'`)
- Trong dialog tạo project, thêm 2 card chọn mode:
  - **Basic**: Tasks, Stages, Scores — mặc định
  - **Custom (Notion-like)**: Block editor tự do
- Gửi `project_mode` trong insert data

**4. Cập nhật `database.ts` type**
- Thêm `project_mode?: 'basic' | 'custom'` vào interface `Group`

### Chưa làm trong giai đoạn này
- UI block editor (Phase 1, giai đoạn 2)
- Cài BlockNote dependencies (Phase 1, giai đoạn 2)
- Render khác nhau trong GroupDetail (Phase 1, giai đoạn 2)

### Files cần sửa

| File | Thay đổi |
|------|----------|
| Migration SQL | Thêm `project_mode` + tạo `project_pages` + RLS |
| `src/pages/Groups.tsx` | Mode selector trong dialog tạo project |
| `src/types/database.ts` | Thêm `project_mode` vào `Group` interface |
| `src/lib/i18n/vi.ts` | Thêm i18n cho mode selector |
| `src/lib/i18n/en.ts` | Thêm i18n cho mode selector |

