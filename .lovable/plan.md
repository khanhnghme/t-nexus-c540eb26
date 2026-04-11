

## Phase 2 — Giai đoạn 2/4: Auto-save & Load content từ DB

### Mục tiêu
Kết nối CanvasEditor với database: auto-save content khi gõ (debounced), load lại content khi mở page. Wire `CreateCustomProject` để thực sự tạo project + page trong DB.

### Hiện trạng
- ✅ Service layer + hooks cho `project_pages` CRUD đã sẵn sàng
- ✅ `CanvasEditor` component hoạt động với `onChange` callback
- ✅ `CreateCustomProject.tsx` có form đầy đủ nhưng chỉ `console.log`
- ❌ Chưa có auto-save logic
- ❌ Chưa có hook `useAutosave` cho debounced saving
- ❌ `handleCreate` chưa insert vào DB

### Hành động cụ thể

**1. Tạo `src/hooks/useAutosave.ts`** — Generic debounced auto-save hook
- Input: `data` (serialized content string), `onSave` callback, `delay` (default 1500ms)
- Output: `{ isSaving, lastSaved, hasUnsavedChanges, forceSave, resetSavedData }`
- Logic: so sánh `data` với `lastSavedData` ref → nếu khác thì debounce → gọi `onSave`
- Cleanup timeout on unmount

**2. Cập nhật `CreateCustomProject.tsx`** — Wire DB insert
- Import `useCreatePage` mutation
- Import `useAuth` để lấy `user.id` cho `created_by`
- `handleCreate`: 
  1. Insert `groups` record với `project_mode: 'custom'` (hoặc chỉ tạo page trước, group creation sẽ ở Phase 3)
  2. Tạm thời: chỉ insert `project_pages` với `group_id` hardcode hoặc tạo group trước
  3. Redirect sau khi tạo thành công
- Vì chưa có mode selector (Phase 3), `handleCreate` sẽ:
  - Tạo group mới (dùng existing group creation logic) với `project_mode: 'custom'`
  - Insert 1 default page với editor content
  - Navigate tới project page sau khi thành công

**3. Tạo component/page để edit existing page** — Integrate auto-save
- Tạo hoặc mở rộng `CanvasEditor` để nhận `pageId` prop
- Khi có `pageId`: fetch content từ DB → hydrate editor với `initialContent`
- Auto-save: mỗi khi `onChange` fire → serialize → pass vào `useAutosave` → gọi `useUpdatePageContent`
- Hiển thị save indicator: "Saving...", "Saved ✓", "Unsaved changes"

### Điều chỉnh scope
Vì Phase 3 mới xử lý mode selector và group creation flow, giai đoạn này sẽ focus vào:
1. Hook `useAutosave` (generic, reusable)
2. Wire `CreateCustomProject` để tạo group + page thực tế trong DB
3. Auto-save content khi edit page đã tồn tại

### Output
- Bấm "Create Project" → tạo group + page trong DB → redirect
- Mở lại page → load đúng content đã lưu
- Gõ text → auto-save sau 1.5s → hiện indicator "Saved ✓"
- Nếu mất mạng/lỗi → hiện lỗi, không mất data local

### Rủi ro
- Group creation cần `workspace_id` — đã có workspace selector trong form
- `idempotency_key` cần cho group creation (pattern đã có trong project) — áp dụng
- BlockNote `editor.document` serialize thành JSON lớn — chưa giới hạn ở giai đoạn này

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useAutosave.ts` | **Mới** — Generic debounced auto-save hook |
| `src/pages/CreateCustomProject.tsx` | Wire DB: tạo group + page, redirect, save indicator |
| `src/components/canvas/CanvasEditor.tsx` | Thêm support load từ DB + auto-save integration |

