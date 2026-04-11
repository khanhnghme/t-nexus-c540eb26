

## Phase 2 — Page Management: Giai đoạn 2/2 (UI / Integration)

Giai đoạn 1 đã hoàn thành: handlers cho rename/delete/reorder/icon đã có trong `CustomProjectView.tsx`, props đã defined trong `NotionPageList.tsx`. Giai đoạn 2 tập trung vào **xây dựng UI tương tác** cho các chức năng này.

### Thay đổi

**1. `NotionPageList.tsx` — Context menu cho mỗi page**
- Right-click (hoặc icon `...`) trên page item → hiện context menu (DropdownMenu)
- Menu items:
  - **Rename** → hiện inline input thay thế title, Enter để save, Esc để cancel
  - **Change icon** → hiện emoji picker popover (dùng danh sách emoji phổ biến, không cần thư viện nặng)
  - **Delete** → confirm dialog trước khi xóa
- Chỉ hiện menu khi `isLeader === true`
- Hiển thị icon emoji thay vì `FileText` nếu page có `icon`

**2. `NotionPageList.tsx` — Drag & drop reorder**
- Sử dụng native HTML5 drag events (`draggable`, `onDragStart`, `onDragOver`, `onDrop`)
- Không cần thêm thư viện — giữ đơn giản
- Visual indicator khi đang drag (opacity, border highlight)
- Chỉ cho phép drag khi `isLeader === true`

**3. `NotionPageList.tsx` — Inline rename**
- State `renamingPageId` + `renameValue`
- Khi chọn Rename từ menu → set `renamingPageId`, render `<Input>` thay vì text
- Enter → gọi `onRenamePage`, Esc → cancel
- Auto-focus input khi bắt đầu rename

**4. Confirm delete dialog**
- Dùng `AlertDialog` component có sẵn
- Hiện tên page đang xóa
- Nút xác nhận destructive

**5. i18n**
- Thêm text: "Rename", "Delete", "Change icon", "Confirm delete", "Are you sure?"

### Không thay đổi database

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/notion/NotionPageList.tsx` | Context menu, inline rename, drag-drop, emoji picker, delete confirm |
| `src/lib/i18n/vi.ts` | Thêm i18n cho menu items |
| `src/lib/i18n/en.ts` | Thêm i18n cho menu items |

