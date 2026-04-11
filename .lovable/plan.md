

## Phase 3 — Slash Commands & Editor Customization: Giai đoạn 1/4 (Database)

Phase 2 đã hoàn thành: page management (rename, delete, reorder, icon). Phase 3 tập trung vào **tuỳ chỉnh Slash Commands và block types** trong BlockNote editor.

### Đánh giá Database

Phase này **không cần thay đổi database**. Slash commands và block customization hoàn toàn là cấu hình frontend — BlockNote lưu kết quả dưới dạng JSON blocks trong cột `content` hiện có của `project_pages`.

### Thay đổi Logic (giai đoạn 1)

**1. `src/components/notion/slash-menu/slashMenuItems.ts` — Tạo mới**
- Định nghĩa danh sách custom slash menu items cho BlockNote
- Các nhóm:
  - **Basic**: Heading 1/2/3, Paragraph, Bullet List, Numbered List
  - **Media**: Image, Video (embed URL)
  - **Advanced**: Callout/Alert box, Code block, Divider, Quote
  - **Table**: Table block
- Mỗi item có: `title`, `subtext`, `group`, `icon`, `aliases` (từ khoá tìm kiếm)
- Export function `getCustomSlashMenuItems(editor)` trả về mảng items tương thích BlockNote API

**2. `src/components/notion/slash-menu/calloutBlock.ts` — Tạo mới**
- Custom block type "Callout" (info/warning/success/error)
- Sử dụng BlockNote `createReactBlockSpec` API
- Định nghĩa schema: `type`, `content` props
- Export block spec để register vào editor

**3. `src/components/notion/slash-menu/index.ts` — Barrel export**
- Re-export tất cả từ các file trên

### Chưa làm trong giai đoạn này
- Tích hợp vào `NotionEditor.tsx` (giai đoạn 2 — logic integration)
- Render UI cho custom blocks (giai đoạn 3-4)
- i18n cho slash menu (giai đoạn 3-4)

### Files cần tạo

| File | Thay đổi |
|------|----------|
| `src/components/notion/slash-menu/slashMenuItems.ts` | **Tạo mới** — Custom slash menu items definition |
| `src/components/notion/slash-menu/calloutBlock.ts` | **Tạo mới** — Callout custom block spec |
| `src/components/notion/slash-menu/index.ts` | **Tạo mới** — Barrel export |

