

## Thêm UI phân biệt dự án Custom trên trang /groups

### Vấn đề
Trang `/groups` không phân biệt trực quan giữa dự án basic và custom. Ngoài ra, link cũng hardcode `/pr/` cho tất cả project.

### Thay đổi — `src/pages/Groups.tsx`

**1. Badge "Custom" trên ảnh bìa (giống DashboardProjectCard)**
Thêm badge với icon `Palette` ở góc dưới trái ảnh bìa khi `group.project_mode === 'custom'`:
```tsx
{group.project_mode === 'custom' && (
  <div className="absolute bottom-3 right-3 drop-shadow-md">
    <Badge className="bg-violet-500/90 text-white shadow-lg text-[10px] px-2 py-0.5 gap-1">
      <Palette className="w-3 h-3" />
      Custom
    </Badge>
  </div>
)}
```

**2. Gradient accent bar khác màu cho custom project**
Dùng gradient tím/violet riêng cho custom project thay vì dùng chung palette:
```tsx
const gradient = group.project_mode === 'custom'
  ? 'from-violet-500 via-purple-500 to-fuchsia-500'
  : gradients[index % gradients.length];
```

**3. Fix URL — custom project dùng `/pa/` thay vì `/pr/`**
Line 832:
```tsx
// Before
to={activeWorkspace?.short_id ? `/pr/ws-${activeWorkspace.short_id}/${group.slug}` : `/p/${group.slug}`}

// After
to={activeWorkspace?.short_id
  ? `${group.project_mode === 'custom' ? '/pa' : '/pr'}/ws-${activeWorkspace.short_id}/${group.slug}`
  : `/p/${group.slug}`}
```

**4. Import `Palette`**
Thêm `Palette` vào danh sách import từ `lucide-react`.

