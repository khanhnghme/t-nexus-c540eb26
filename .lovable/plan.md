

## Fix: Dự án custom phải dùng URL `/pa/` thay vì `/pr/`

### Vấn đề
Tất cả dự án (cả basic lẫn custom) đều dùng prefix `/pr/`, nhưng đúng ra custom project phải dùng `/pa/` vì nó là trang canvas.

### Thay đổi

| File | Nội dung |
|------|----------|
| **`src/components/dashboard/DashboardProjectCard.tsx`** (line 79) | Kiểm tra `group.project_mode === 'custom'` → dùng `/pa/ws-...` thay vì `/pr/ws-...` |
| **`src/pages/CreateCustomProject.tsx`** (line 124) | Đổi `getProjectUrl` → `getPageUrl` để navigate đúng sau khi tạo custom project |

### Chi tiết

**DashboardProjectCard.tsx** — line 79:
```typescript
// Before
{ to: `/pr/ws-${activeWorkspace.short_id}/${group.slug}` }

// After
{ to: group.project_mode === 'custom'
    ? `/pa/ws-${activeWorkspace.short_id}/${group.slug}`
    : `/pr/ws-${activeWorkspace.short_id}/${group.slug}` }
```

**CreateCustomProject.tsx** — line 124:
```typescript
// Before
navigate(getProjectUrl(wsShortId, projectSlug));

// After
navigate(getPageUrl(wsShortId, projectSlug));
```

