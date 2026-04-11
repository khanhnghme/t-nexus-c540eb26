

## Redesign Canvas UI theo ngôn ngữ thiết kế AFFiNE

### Phân tích so sánh hiện tại vs AFFiNE

Nhìn vào screenshot AFFiNE app:
- **TopBar**: Rất mỏng, chỉ hiện icon mode (Doc/Edgeless), tên trang ở giữa, và nút Share + layout toggle ở phải
- **Sidebar**: Sạch sẽ, không border nặng, nhóm theo Favorites/Organize/Tags/Collections/Others
- **Editor area**: Toàn màn hình, không border/rounded corners, title cực lớn, nội dung trung tâm hóa với max-width
- **Canvas toolbar**: Thanh toolbar nằm trong content area, không phải trên header

**Hiện tại T-Nexus Canvas** có vấn đề:
1. TopBar hiển thị "Chi tiết dự án / Canvas" — thừa, không cần thiết cho Custom mode
2. Có thêm 1 header row (Back + Project name + Canvas badge) bên trong GroupDetail — trùng lặp
3. CanvasPageView có thêm toolbar bar (icon + title + Edit/Template/Export/Share/Help) — quá nhiều nút
4. Editor bọc trong `border rounded-lg bg-card` — trông như widget thay vì workspace toàn màn hình
5. Canvas sidebar hẹp, có border, trông tách biệt

### Kế hoạch thay đổi

#### 1. GroupDetail.tsx — Canvas mode fullscreen
- Bỏ header row (back button + project name + badge) vì TopBar đã có breadcrumb
- Bỏ `border rounded-lg` wrapper, để CanvasPageView chiếm full content area
- Thêm padding nhỏ hoặc không padding

#### 2. TopBar.tsx — Custom mode cải tiến theo AFFiNE
- Khi `projectMode === 'custom'`: hiển thị theo phong cách AFFiNE
  - Trái: icon sidebar toggle (PanelLeft)
  - Giữa: mode icons (Doc icon) + tên trang hiện tại + chevron dropdown
  - Phải: Star/Favorite + Share button + MoreOptions (...)
- Bỏ badge "Canvas", thay bằng visual indicator tinh tế hơn

#### 3. CanvasPageView.tsx — Toolbar tinh gọn kiểu AFFiNE
- Bỏ outer `border rounded-lg bg-card overflow-hidden` wrapper
- Thanh toolbar trên cùng: thu gọn, chỉ hiện icon (không text), mỏng hơn
- Di chuyển Edit/View toggle thành icon-only
- Gom Export/Template/Share vào "..." dropdown menu
- Last editor indicator giữ lại nhưng style nhỏ hơn

#### 4. CanvasSidebar.tsx — Thiết kế lại theo AFFiNE sidebar
- Background nhẹ hơn (không `bg-muted/30`, dùng subtle bg)
- Bỏ uppercase "TRANG" header, thay bằng nhóm tự nhiên
- Page items: indent tự nhiên, hover effect subtle
- Active page: highlight nhẹ kiểu AFFiNE (bg-accent mỏng + thanh dọc bên trái)
- Search pages input nhỏ ở trên

#### 5. CanvasEditor.tsx + PageHeader.tsx — Notion/AFFiNE style
- Title lớn hơn (text-4xl → text-5xl), font-weight 700
- Centering nội dung với max-width ~720px và margin auto
- Save status indicator nhỏ gọn hơn, float ở góc

#### 6. CSS updates (index.css)
- Custom mode: ẩn TopBar row cũ hoặc style lại
- Content area không border, không rounded

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/GroupDetail.tsx` | Bỏ header row cho custom mode, fullscreen canvas |
| `src/components/layout/TopBar.tsx` | Redesign custom mode layout theo AFFiNE |
| `src/components/canvas/CanvasPageView.tsx` | Bỏ border wrapper, toolbar tinh gọn, gom actions vào dropdown |
| `src/components/canvas/CanvasSidebar.tsx` | Redesign theo AFFiNE sidebar style |
| `src/components/canvas/CanvasEditor.tsx` | Center content, save indicator gọn hơn |
| `src/components/canvas/PageHeader.tsx` | Title lớn hơn, centered layout |

### Không làm
- Edgeless/Whiteboard mode (cần tldraw, scope riêng)
- Journal feature
- Tags/Collections system
- AI Intelligence panel

