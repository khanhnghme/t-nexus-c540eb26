

## Phase 3 — Slash Commands & Editor Customization: Giai đoạn 3/4 (UI Design & Build)

Giai đoạn 1-2 đã hoàn thành: CalloutBlock đã được định nghĩa và tích hợp vào editor, slash menu custom đã hoạt động. Giai đoạn 3 tập trung vào **styling và polish UI** cho editor.

### Thay đổi

**1. `calloutBlock.tsx` — Nâng cấp styling**
- Chuyển từ inline styles sang Tailwind CSS classes để nhất quán với dự án
- Thêm dark mode support (hiện chỉ có light colors)
- Cải thiện hover effect trên icon (tooltip hint "Click to change type")
- Thêm transition animation khi chuyển callout type

**2. `slashMenuItems.ts` — Thêm icon cho menu items**
- Thêm property `icon` cho mỗi slash menu item (sử dụng emoji hoặc Lucide icon name)
- Giúp slash menu dễ nhận diện hơn khi user gõ `/`

**3. CSS cho editor — Tạo `src/components/notion/notion-editor.css`**
- Custom styles cho BlockNote editor container (padding, typography)
- Style cho slash menu dropdown (border-radius, shadow, spacing)
- Style cho callout block trong editor context
- Responsive adjustments cho mobile view

### Không thay đổi database
### Không thay đổi logic (đã hoàn thành ở giai đoạn 1-2)

### Files cần sửa/tạo

| File | Thay đổi |
|------|----------|
| `src/components/notion/slash-menu/calloutBlock.tsx` | Upgrade styling, dark mode, transitions |
| `src/components/notion/slash-menu/slashMenuItems.ts` | Thêm icons cho menu items |
| `src/components/notion/notion-editor.css` | **Tạo mới** — Custom CSS cho editor |
| `src/components/notion/NotionEditor.tsx` | Import CSS file mới |

