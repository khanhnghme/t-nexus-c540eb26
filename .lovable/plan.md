

## Điều chỉnh TopBar cho Custom Mode + Fix runtime error

### Vấn đề
1. **TopBar hiện tại**: Khi vào dự án Custom (Canvas), TopBar vẫn hiển thị các tab của Basic mode (Overview, Tasks, Meetings, Resources, Members, Scores...) vì `setProjectNavProps` được gọi cho **tất cả** dự án, không phân biệt `project_mode`.
2. **Runtime error**: `block.content?.map is not a function` trong `canvasExport.ts` — một số block có `content` là string thay vì array.

### Giải pháp

#### 1. Thêm `projectMode` vào `ProjectNavProps`

**File: `src/contexts/DashboardLayoutContext.tsx`**
- Thêm field `projectMode?: 'basic' | 'custom'` vào `ProjectNavProps`

#### 2. Truyền `projectMode` từ GroupDetail

**File: `src/pages/GroupDetail.tsx`** (dòng 131-145)
- Khi `setProjectNavProps`, bổ sung `projectMode: group.project_mode`
- Với custom mode, không cần truyền `activeTab` / `onTabChange` (TopBar sẽ không render tabs)

#### 3. TopBar hiển thị khác cho Custom mode

**File: `src/components/layout/TopBar.tsx`**
- Nếu `projectNavProps.projectMode === 'custom'`: hiển thị breadcrumb đơn giản (tên dự án + badge "Canvas") thay vì tabs
- Nếu `projectNavProps.projectMode !== 'custom'`: giữ nguyên logic tabs hiện tại

#### 4. Fix runtime error trong canvasExport

**File: `src/lib/canvasExport.ts`**
- Wrap `block.content` access: kiểm tra `Array.isArray(block.content)` trước khi `.map()`
- Nếu `content` là string → dùng trực tiếp; nếu undefined → trả `""`

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/contexts/DashboardLayoutContext.tsx` | Thêm `projectMode` vào interface |
| `src/pages/GroupDetail.tsx` | Truyền `projectMode` khi set nav props |
| `src/components/layout/TopBar.tsx` | Render breadcrumb cho custom, tabs cho basic |
| `src/lib/canvasExport.ts` | Fix `content?.map` crash |

