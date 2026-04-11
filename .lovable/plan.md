

## Phase 3 — Slash Commands & Editor Customization: Giai đoạn 2/4 (Logic Integration)

Giai đoạn 1 đã hoàn thành: định nghĩa `CalloutBlock`, `getCustomSlashMenuItems`, `filterSlashMenuItems`. Giai đoạn 2 tập trung vào **tích hợp logic** vào `NotionEditor.tsx` — register custom blocks và slash menu vào BlockNote editor.

### Thay đổi

**1. `NotionEditor.tsx` — Register custom block schema**
- Import `CalloutBlock` từ slash-menu module
- Tạo custom schema bằng `BlockNoteSchema.create({ blockSpecs: { ...defaultBlockSpecs, callout: CalloutBlock } })`
- Truyền schema vào `useCreateBlockNote` để editor nhận diện block type `callout`

**2. `NotionEditor.tsx` — Override slash menu items**
- Import `getCustomSlashMenuItems` và `filterSlashMenuItems`
- Truyền `slashMenu` config vào `BlockNoteView` hoặc sử dụng `SuggestionMenuController` để replace default slash menu bằng custom items
- Đảm bảo filter/search hoạt động qua `filterSlashMenuItems`

**3. Type safety**
- Update generic types cho editor để tương thích với custom block schema
- Đảm bảo `Block` type trong props vẫn tương thích

### Không thay đổi database
### Không thay đổi UI rendering (giai đoạn 3-4)

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/notion/NotionEditor.tsx` | Register CalloutBlock schema + custom slash menu items |

