

## Phase 19 & 20 — Keyboard Shortcuts + Canvas Activity Log

### Phase 19: Keyboard Shortcuts

**Mục tiêu:** Power user experience với phím tắt tùy chỉnh cho Canvas.

BlockNote đã có sẵn các phím tắt cơ bản (Ctrl+B, Ctrl+I, Ctrl+/, etc.). Chỉ cần bổ sung:

**1. Custom keyboard shortcuts hook**

Tạo `src/hooks/useCanvasShortcuts.ts`:
- `Ctrl+S` / `Cmd+S` — force save (trigger auto-save ngay lập tức)
- `Ctrl+N` / `Cmd+N` — tạo page mới
- `Ctrl+Shift+T` — insert task block vào editor
- `Ctrl+?` / `Cmd+?` — mở shortcut help modal
- `Ctrl+\` — toggle sidebar
- `Ctrl+E` — toggle edit/view mode

Hook nhận callbacks từ `CanvasPageView` và đăng ký global `keydown` listener. Cleanup khi unmount.

**2. Shortcut help modal**

Tạo `src/components/canvas/ShortcutHelpDialog.tsx`:
- Dialog hiển thị bảng phím tắt (2 cột: shortcut + mô tả)
- Bao gồm cả BlockNote built-in shortcuts và custom shortcuts
- Mở bằng `Ctrl+?` hoặc nút `?` trên header

**3. Tích hợp vào CanvasPageView**

- Import `useCanvasShortcuts` và truyền callbacks (save, create page, toggle sidebar, toggle edit)
- Thêm nút `?` icon trên header bar để mở shortcut help

### Phase 20: Canvas Activity Log

**Mục tiêu:** Track thay đổi canvas (ai sửa gì, khi nào) — reuse hệ thống `activity_logs` đã có.

**1. Log canvas actions**

Trong `CanvasPageView.tsx`, gọi `logActivity()` (từ `src/lib/activityLogger.ts`) khi:
- Tạo page mới → `action: 'page_created'`, `actionType: 'project'`
- Xóa page → `action: 'page_deleted'`
- Đổi tên page → `action: 'page_renamed'`
- Save content (debounced, chỉ log 1 lần mỗi session hoặc mỗi 5 phút) → `action: 'page_updated'`

Không cần migration — bảng `activity_logs` đã tồn tại và đủ flexible (action TEXT, metadata JSONB).

**2. "Last edited by" indicator**

Trong `CanvasPageView.tsx` header hoặc `CanvasEditor.tsx`:
- Query `activity_logs` cho page hiện tại, lấy record mới nhất với `action = 'page_updated'`
- Hiển thị: "Chỉnh sửa lần cuối bởi X, 5 phút trước" dạng text nhỏ
- Dùng `useQuery` với `staleTime: 60000` (refresh mỗi phút)

**3. Hook `usePageLastEditor`**

Tạo `src/hooks/usePageLastEditor.ts`:
- Query `activity_logs` WHERE metadata->>'page_id' = pageId, ORDER BY created_at DESC, LIMIT 1
- Join profiles để lấy tên người sửa
- Return `{ editorName, editedAt, isLoading }`

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useCanvasShortcuts.ts` | Mới — global keyboard listener |
| `src/components/canvas/ShortcutHelpDialog.tsx` | Mới — modal hiển thị phím tắt |
| `src/hooks/usePageLastEditor.ts` | Mới — query last editor |
| `src/components/canvas/CanvasPageView.tsx` | Tích hợp shortcuts + logActivity + last edited indicator |
| `src/components/canvas/CanvasEditor.tsx` | Expose force-save callback |

### Không làm
- Custom keybinding configuration (user tự đổi phím tắt)
- Diff/version history cho pages
- Real-time activity feed

