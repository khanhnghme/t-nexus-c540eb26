

## Phase 1 — Block Editor Core: Giai đoạn 2/2 (UI / Integration)

Giai đoạn 1 đã hoàn thành: bảng `project_pages`, cột `project_mode` trên `groups`, mode selector trong dialog tạo project. Giai đoạn 2 tập trung vào **cài đặt BlockNote và render editor trong project Custom**.

### Thay đổi

**1. Cài đặt dependencies**
- `@blocknote/core`, `@blocknote/react`, `@blocknote/mantine`

**2. `src/components/notion/NotionEditor.tsx` — Tạo mới**
- Wrap `BlockNoteView` với `useCreateBlockNote`
- Props: `pageId`, `initialContent`, `onChange`, `editable`
- Hỗ trợ: text, heading, list, image (các block mặc định của BlockNote)
- Tích hợp `useAutosave` để tự động lưu content (JSON) vào bảng `project_pages`
- Hiển thị trạng thái saving (spinner nhỏ)

**3. `src/components/notion/NotionPageList.tsx` — Tạo mới**
- Sidebar nhỏ hiển thị danh sách pages của project Custom
- Nút "+" tạo page mới (insert vào `project_pages`)
- Click chọn page → load content vào editor
- Sắp xếp theo `display_order`

**4. `src/components/notion/CustomProjectView.tsx` — Tạo mới**
- Layout wrapper: sidebar pages (trái) + editor (phải)
- Quản lý state: `selectedPageId`, load/save logic
- Tự tạo page đầu tiên nếu project chưa có page nào

**5. `src/pages/GroupDetail.tsx` — Render theo mode**
- Kiểm tra `group.project_mode`
- Nếu `'custom'`: render `<CustomProjectView>` thay vì tabs tasks/stages hiện tại
- Nếu `'basic'`: giữ nguyên UI hiện tại
- Vẫn giữ các tab chung: members, settings, logs (nếu có quyền)

**6. i18n**
- Thêm text: "Untitled", "New page", "Saving...", "Saved"

### Chưa làm
- Slash commands tuỳ chỉnh (Phase 3)
- Task table/Kanban blocks (Phase 4-7)
- Không thay đổi database

### Files cần tạo/sửa

| File | Thay đổi |
|------|----------|
| `package.json` | Thêm BlockNote dependencies |
| `src/components/notion/NotionEditor.tsx` | **Tạo mới** — BlockNote editor |
| `src/components/notion/NotionPageList.tsx` | **Tạo mới** — Pages sidebar |
| `src/components/notion/CustomProjectView.tsx` | **Tạo mới** — Layout wrapper |
| `src/pages/GroupDetail.tsx` | Conditional render theo `project_mode` |
| `src/lib/i18n/vi.ts` | Thêm i18n |
| `src/lib/i18n/en.ts` | Thêm i18n |

