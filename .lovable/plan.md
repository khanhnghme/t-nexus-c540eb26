

## Fix: Sidebar project switching — stale state & multiple active highlights

### Vấn đề

1. **Dữ liệu cũ không reset**: Khi chuyển giữa các project trên sidebar, `GroupDetail` không bị remount (cùng route pattern), nên state cũ (group, members, tasks) vẫn hiển thị trong khi data mới đang load → "hiển thị 2 project 1 lúc"
2. **Active highlight sai**: `location.pathname.startsWith(href)` có thể match nhiều project nếu slug là prefix của nhau (vd: `/pa/ws-xxx/abc` match cả `/pa/ws-xxx/abc-def`)
3. **Load chậm/không load**: `fetchGroupData` không reset `isLoading = true` khi routeId thay đổi, nên không hiện loading spinner

### Thay đổi

| File | Nội dung |
|------|----------|
| **`src/pages/GroupDetail.tsx`** | Reset toàn bộ state khi `routeId` thay đổi: set `isLoading=true`, clear `group`, `members`, `tasks`, `stages`, `isAccessDenied` |
| **`src/components/SidebarTreeNav.tsx`** | Fix active detection: so sánh exact path thay vì `startsWith` |

### Chi tiết

**GroupDetail.tsx** — thêm useEffect reset state trước line 180:
```typescript
// Reset state when switching projects
useEffect(() => {
  setGroup(null);
  setMembers([]);
  setTasks([]);
  setStages([]);
  setIsLoading(true);
  setIsAccessDenied(false);
  setIsLeaderInGroup(false);
  setIsGroupCreator(false);
}, [routeId]);
```

**SidebarTreeNav.tsx** — line 239, fix active detection:
```typescript
// Before: const active = location.pathname.startsWith(href);
// After:
const active = location.pathname === href || location.pathname.startsWith(href + '/');
```

Thêm `/` sau href để tránh match nhầm khi slug là prefix của slug khác.

