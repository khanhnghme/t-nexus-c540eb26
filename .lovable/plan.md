

## Phase 1 — Giai đoạn 3/4: Install BlockNote + Tạo CanvasEditor Component

### Mục tiêu
Cài đặt thư viện BlockNote và tạo component `CanvasEditor` cơ bản — editor chạy được với basic blocks (text, heading, list, divider). Chưa kết nối DB, chưa có routing.

### Hành động cụ thể

**1. Cài đặt packages**
```bash
npm install @blocknote/core @blocknote/react @blocknote/shadcn
```
Project đã dùng shadcn/ui + Tailwind nên dùng `@blocknote/shadcn` variant.

**2. Import stylesheet**
Thêm `@blocknote/shadcn/style.css` vào `src/index.css` (hoặc import trong component).

**3. Tạo `src/components/canvas/CanvasEditor.tsx`**
- Wrapper component sử dụng `useCreateBlockNote()` hook + `BlockNoteView` từ `@blocknote/shadcn`
- Props: `initialContent?: Block[]`, `editable?: boolean`, `onChange?: (content: Block[]) => void`
- Basic blocks mặc định: Heading (H1/H2/H3), Paragraph, Bullet List, Numbered List, Divider
- Slash command (`/`) hoạt động built-in (không cần code thêm)
- Dark mode support: truyền `theme` prop từ ThemeProvider context

**4. Tạo `src/pages/CreateCustomProject.tsx`** (trang test tạm)
- Trang trắng đơn giản: Input tên project + CanvasEditor bên dưới
- Chưa lưu DB, chưa tạo project — chỉ để verify editor hoạt động
- Import bằng `React.lazy()` để tránh tăng bundle size

**5. Thêm route tạm trong `src/App.tsx`**
- Route: `/create-custom` → `CreateCustomProject`
- Nằm trong `ProtectedLayout` (cần đăng nhập)

### Output
- Editor BlockNote render được trên trang `/create-custom`
- Gõ text, heading, list, dùng slash command `/` hoạt động
- Dark mode tương thích
- Chưa có: lưu DB, tạo project thật, mode selector

### Rủi ro
- BlockNote bundle ~200KB — dùng `React.lazy()` + `Suspense` để code-split
- `@blocknote/shadcn/style.css` có thể conflict với Tailwind styles — cần test visual
- BlockNote v0.47+ yêu cầu React 18+ — project đã dùng React 18, OK

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `package.json` | Thêm 3 packages BlockNote |
| `src/index.css` | Import `@blocknote/shadcn/style.css` |
| `src/components/canvas/CanvasEditor.tsx` | **Mới** — BlockNote wrapper component |
| `src/pages/CreateCustomProject.tsx` | **Mới** — Trang test editor (tạm) |
| `src/App.tsx` | Thêm route `/create-custom` |

