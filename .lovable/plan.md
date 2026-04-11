

## Phase 4 — Giai doan 3/4: Page Icon/Emoji cho Sidebar

### Muc tieu
Cho phep user chon emoji/icon cho moi page, hien thi trong sidebar thay vi icon FileText mac dinh. Giup phan biet nhanh cac trang.

### Hien trang
- DB `project_pages` da co column `icon` (nullable string) — service layer da ho tro `icon` trong create va update
- Sidebar hien tai dung `FileText` icon co dinh cho moi page
- Chua co UI de chon/thay doi icon

### Hanh dong cu the

**1. Tao Emoji Picker component (`src/components/canvas/EmojiPicker.tsx`)**
- Popover chua grid cac emoji pho bien (20-30 emoji thong dung: documents, folders, stars, flags, colors...)
- Nhan prop `onSelect(emoji: string)` va `currentEmoji?: string`
- Co option "Remove" de xoa icon (set ve null)
- Khong dung thu vien ngoai, chi dung emoji Unicode + Popover co san

**2. Cap nhat `src/components/canvas/CanvasSidebar.tsx`**
- Thay `FileText` icon bang emoji tu `page.icon` neu co, giu `FileText` lam fallback
- Khi editable: click vao icon/emoji mo EmojiPicker popover
- Goi callback `onChangePageIcon(pageId, emoji | null)` khi chon
- Them prop `onChangePageIcon` vao interface

**3. Cap nhat `src/components/canvas/CanvasPageView.tsx`**
- Them handler `handleChangePageIcon`: goi `useUpdatePage` voi `{ icon: emoji }`
- Truyen `onChangePageIcon` xuong CanvasSidebar
- Them `icon` vao pages map truyen xuong sidebar

### Khong lam trong giai doan nay
- Page cover image (giai doan 4)
- Custom icon upload (chi dung emoji Unicode)

### Files thay doi

| File | Thay doi |
|------|----------|
| `src/components/canvas/EmojiPicker.tsx` | **Moi** — Popover chon emoji |
| `src/components/canvas/CanvasSidebar.tsx` | Hien thi emoji, tich hop EmojiPicker |
| `src/components/canvas/CanvasPageView.tsx` | Them handler + truyen icon data xuong |

