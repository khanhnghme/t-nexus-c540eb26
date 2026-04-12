

## Fix: Sidebar navigation dùng `/pa/` cho custom project

### Vấn đề
`SidebarTreeNav.tsx` luôn tạo link `/pr/ws-...` cho mọi project, kể cả custom project (cần `/pa/ws-...`).

### Nguyên nhân
- `useWorkspaceProjects` không fetch `project_mode` từ bảng `groups`
- `SidebarTreeNav` không kiểm tra `project_mode` khi tạo URL

### Thay đổi

| File | Nội dung |
|------|----------|
| **`src/hooks/useWorkspaceProjects.ts`** | Thêm `project_mode` vào interface `WorkspaceProject` và vào `.select()` query (2 chỗ: line 41 và line 53) |
| **`src/components/SidebarTreeNav.tsx`** | Kiểm tra `p.project_mode === 'custom'` → dùng `/pa/ws-...` thay vì `/pr/ws-...` (line 129 và line 233) |

### Chi tiết

**useWorkspaceProjects.ts:**
```typescript
export interface WorkspaceProject {
  id: string;
  name: string;
  slug: string | null;
  visibility: string;
  project_mode: string | null;  // thêm
  isMember: boolean;
}

// 2 chỗ select:
.select('id, name, slug, visibility, project_mode')
```

**SidebarTreeNav.tsx — line 129 và 233:**
```typescript
const getProjectHref = (p: WorkspaceProject) => {
  if (!activeWorkspace?.short_id) return `/p/${p.slug || p.id}`;
  const prefix = p.project_mode === 'custom' ? '/pa' : '/pr';
  return `${prefix}/ws-${activeWorkspace.short_id}/${p.slug || p.id}`;
};
```

