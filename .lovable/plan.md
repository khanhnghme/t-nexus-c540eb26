

## Phase 15 — Performance Optimization

### Mục tiêu
Canvas mượt mà với nhiều blocks, giảm re-renders không cần thiết, lazy load custom blocks, tối ưu auto-save.

### Hiện trạng
- 5 custom blocks (TaskBlock, MemberBlock, CalendarBlock, NoteBlock, ToggleBlock) đều import trực tiếp, không lazy
- Auto-save delay đang ở 1500ms
- Không có React.memo hay virtualization
- Skeleton loading đã có ở TaskBlock, chưa đồng nhất ở các block khác

### Công việc

**1. Lazy load custom blocks**

Tạo `src/components/canvas/blocks/lazyBlocks.ts` — export lazy-wrapped versions của tất cả custom block renderers. Trong `CanvasEditor.tsx`, wrap mỗi block renderer bằng `React.lazy` + `Suspense` với Skeleton fallback.

Lưu ý: BlockNote `createReactBlockSpec` cần component đồng bộ ở thời điểm tạo schema. Cách tiếp cận: giữ block spec wrapper đồng bộ, nhưng bên trong render component dùng lazy import cho phần nội dung nặng (data-fetching renderers như `TaskListRenderer`, `MemberListRenderer`, `CalendarRenderer`).

**2. React.memo cho block renderers**

Wrap các inner renderer components bằng `React.memo`:
- `TaskListRenderer` trong TaskBlock
- `MemberListRenderer` trong MemberBlock  
- `CalendarRenderer` trong CalendarBlock
- `NoteCalloutRenderer` trong NoteBlock
- `ToggleRenderer` trong ToggleBlock

**3. useMemo / useCallback audit**

Rà soát và thêm memoization cho:
- `schema` object trong CanvasEditor (đã tạo ngoài component — OK)
- `handlers` object trong TaskBlock (đã có useMemo — OK)
- Props truyền xuống child components — đảm bảo stable references

**4. Giảm auto-save delay xuống 800ms**

Trong `CanvasEditor.tsx`, đổi `delay: 1500` → `delay: 800` cho responsive hơn nhưng vẫn không spam API.

**5. Skeleton loading đồng nhất cho tất cả custom blocks**

Thêm loading skeleton cho MemberBlock, CalendarBlock nếu chưa có. Tạo shared `BlockSkeleton` component dùng chung.

**6. Debounce title edit trong PageHeader**

Đảm bảo inline title edit có debounce trước khi gọi API update, tránh gọi API mỗi keystroke.

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/blocks/BlockSkeleton.tsx` | Mới — shared skeleton component |
| `src/components/canvas/blocks/TaskBlock.tsx` | React.memo cho renderer |
| `src/components/canvas/blocks/MemberBlock.tsx` | React.memo + skeleton loading |
| `src/components/canvas/blocks/CalendarBlock.tsx` | React.memo + skeleton loading |
| `src/components/canvas/blocks/NoteBlock.tsx` | React.memo |
| `src/components/canvas/blocks/ToggleBlock.tsx` | React.memo |
| `src/components/canvas/CanvasEditor.tsx` | Lazy load renderers + giảm delay 800ms |
| `src/components/canvas/PageHeader.tsx` | Debounce title edit |

### Không làm
- Virtualization (react-window) — chỉ cần khi thực sự có > 50 blocks, phức tạp với BlockNote
- Bundle splitting riêng cho từng block (không đáng với kích thước hiện tại)

