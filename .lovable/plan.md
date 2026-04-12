

## Phase 4: Nâng cao UX & Polish Multi-Column

### Bối cảnh
Phase 1-3 đã hoàn thành: cài đặt, styling responsive, export, và fix bug double-render. Phase 4 tập trung vào cải thiện trải nghiệm người dùng khi làm việc với columns.

### Bước thực hiện

**Bước 1: Tùy chỉnh Slash Menu — thêm label tiếng Việt cho Columns**

File: `src/components/canvas/CanvasEditor.tsx`

- Import `getMultiColumnSlashMenuItems` từ `@blocknote/xl-multi-column`
- Tạo custom slash menu items: merge default items + multi-column items
- Override label "Columns" thành "Chia cột" khi `locale === 'vi'`
- Truyền vào `useCreateBlockNote` hoặc custom `slashMenu` component

**Bước 2: CSS polish — hover state & visual cue cho columns**

File: `src/index.css`

- Thêm subtle hover border cho `.bn-column-list` khi editable (giúp user nhận biết đang hover vào vùng columns)
- Thêm transition cho border/background khi hover
- Đảm bảo view-mode (read-only) không hiện hover effect
- Tối ưu spacing giữa columns trong dark mode

**Bước 3: Cải thiện print/export layout cho columns**

File: `src/lib/canvasExport.ts`

- Thêm label "Cột 1", "Cột 2",... trước mỗi column trong PDF export để người đọc dễ phân biệt
- Cải thiện separator style (dùng dashed line thay vì solid)
- Markdown export: thêm header `**Cột 1:**`, `**Cột 2:**` trước nội dung mỗi cột

**Bước 4: Xử lý edge case — empty columns & single column**

File: `src/lib/canvasExport.ts`

- Skip render column rỗng (không có children) trong cả Markdown và PDF
- Nếu `columnList` chỉ có 1 column → render như block bình thường (không cần separator)

### Files thay đổi
1. `src/components/canvas/CanvasEditor.tsx` — custom slash menu items cho multi-column
2. `src/index.css` — ~15 dòng CSS hover effects
3. `src/lib/canvasExport.ts` — cải thiện label & xử lý edge cases

### Không thay đổi
- Database
- PublicCanvasPage
- Custom block components

