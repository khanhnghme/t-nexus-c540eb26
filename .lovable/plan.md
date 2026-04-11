

## Phase 3 — Slash Commands & Editor Customization: Giai đoạn 4/4 (Final Polish & Testing)

Giai đoạn 1-3 đã hoàn thành: CalloutBlock định nghĩa, tích hợp vào editor, styling CSS. Giai đoạn 4 tập trung vào **polish cuối cùng và đảm bảo chất lượng**.

### Thay đổi

**1. `calloutBlock.tsx` — Fix `CalloutBlock` export**
- Hiện tại `CalloutBlock` được gọi như function `CalloutBlock()` trong `NotionEditor.tsx` nhưng `createReactBlockSpec` trả về object, không phải function — cần verify và fix nếu sai

**2. `slashMenuItems.ts` — Loại bỏ items trùng với default**
- Hiện tại custom items (Heading 1/2/3, Paragraph, Bullet List, Numbered List) trùng với `getDefaultReactSlashMenuItems` — gây duplicate trong slash menu
- Chỉ giữ lại items thực sự custom: Callout, Code Block, Table, Image, Video
- Hoặc loại bỏ hoàn toàn `getDefaultReactSlashMenuItems` và chỉ dùng custom list

**3. `notion-editor.css` — Dark mode support**
- Thêm dark mode overrides cho slash menu và callout block
- Sử dụng `.dark` class hoặc `prefers-color-scheme`

**4. i18n — Thêm translations cho slash menu**
- Thêm text cho slash menu items vào `vi.ts` và `en.ts`
- Titles: "Heading 1", "Bullet List", "Callout", etc.
- Subtexts: "Large section heading", "Highlight important info", etc.

### Không thay đổi database

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/notion/slash-menu/calloutBlock.tsx` | Verify export pattern |
| `src/components/notion/slash-menu/slashMenuItems.ts` | Remove duplicate items, chỉ giữ custom |
| `src/components/notion/notion-editor.css` | Dark mode support |
| `src/lib/i18n/vi.ts` | Thêm slash menu translations |
| `src/lib/i18n/en.ts` | Thêm slash menu translations |

