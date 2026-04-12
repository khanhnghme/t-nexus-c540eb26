

## Triển khai Database Templates

### Mục tiêu
Khi user chèn `/database`, hiện template picker cho chọn mẫu có sẵn (Task Tracker, CRM, Content Calendar...) với data pre-filled. Chọn xong → database hiện ngay với views + items mẫu, sửa được luôn.

### Files thay đổi

| File | Action |
|------|--------|
| `src/components/canvas/blocks/database/databaseTemplates.ts` | Mới — 6 template definitions |
| `src/components/canvas/blocks/database/DatabaseTemplatePicker.tsx` | Mới — UI grid chọn template |
| `src/components/canvas/blocks/database/DatabaseBlock.tsx` | Sửa — hiện picker khi props rỗng |

### Chi tiết

**1. `databaseTemplates.ts`** — Mỗi template là `{ id, name, icon, description, build: () => DatabaseBlockData }`:

- **Blank** — Name + Status, Table view, 0 items
- **Task Tracker** — Name, Status, Priority, Due Date, Assignee → Board view groupBy Status, 3 items mẫu
- **CRM** — Name, Email, Company, Stage, Phone → Table view, 2 items mẫu
- **Content Calendar** — Title, Type, Publish Date, Status, URL → Calendar view, 3 items mẫu
- **Reading List** — Title, Author, Genre, Rating, Finished, URL → List view, 2 items mẫu
- **Meeting Notes** — Title, Date, Attendees, Action Items, Status → Table view, 1 item mẫu

Dùng `generateId()`, `createDefaultView()` từ `types.ts`.

**2. `DatabaseTemplatePicker.tsx`** — Grid 3 cột, mỗi card dùng shadcn `Card` hiện icon (Lucide) + tên + mô tả ngắn. Click → gọi `onSelect(template.build())`.

**3. `DatabaseBlock.tsx`** — Thêm logic trong `DatabaseRenderer`:
```typescript
const isInitialized = blockProps.properties && blockProps.properties !== "";
if (!isInitialized) {
  return <DatabaseTemplatePicker onSelect={(data) => {
    updateProps({
      properties: JSON.stringify(data.properties),
      items: JSON.stringify(data.items),
      views: JSON.stringify(data.views),
      activeViewId: data.activeViewId,
    });
  }} />;
}
```

Không cần migration hay thư viện mới. Tất cả hardcoded client-side.

