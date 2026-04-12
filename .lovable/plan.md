

## Fix: Sidebar crash khi không có workspace mặc định + xử lý xóa hết workspace

### Nguyên nhân gốc

1. **Runtime error**: `useWorkspaceBilling()` trả về object nhưng khi `activeWorkspace` là `null`, các component (`SidebarTreeNav`, `WorkspaceSwitcherCell`, `UpgradeBox`) vẫn destructure `{ ownerPlan }` từ kết quả → crash khi billing data chưa sẵn sàng
2. **Không có workspace**: Khi user xóa hết workspace hoặc chưa có workspace nào, sidebar mất toàn bộ navigation
3. **Không có cơ chế phục hồi**: User bị kẹt, không có hướng dẫn tạo workspace mới

### Giải pháp

**File: `src/hooks/useWorkspaceBilling.ts`**
- Thêm null-safe guard: khi `activeWorkspace` null, trả về default object thay vì để các query chạy với undefined values
- Đảm bảo hook LUÔN trả về object hợp lệ, không bao giờ null

**File: `src/components/SidebarTreeNav.tsx`**
- Thêm safe destructuring: `const billing = useWorkspaceBilling(); const ownerPlan = billing?.ownerPlan;`
- Khi `!isAvailable || !activeWorkspace`: hiển thị phần "Personal" navigation (Calendar, Tips, Feedback, Account) + nút "Tạo Workspace" nổi bật thay vì để trống

**File: `src/components/layout/DashboardLayout.tsx`**
- `WorkspaceSwitcherCell`: thêm safe access cho `useWorkspaceBilling()` (line 106)
- `UpgradeBox`: thêm safe access cho `useWorkspaceBilling()` (line 223)
- Khi `workspaces.length === 0 && isAvailable`: hiển thị CTA "Tạo Workspace đầu tiên" trong workspace switcher thay vì chỉ logo

**File: `src/contexts/WorkspaceContext.tsx`**
- Khi fetch xong mà `allWorkspaces.length === 0`: set `activeWorkspace = null`, `isAvailable = true` (workspace feature available, just empty)
- Đảm bảo `isLoading` kết thúc đúng

### Chi tiết kỹ thuật

```text
User có workspace    → Sidebar bình thường (như hiện tại)
User 0 workspace     → Sidebar hiện Personal nav + CTA "Tạo Workspace"  
useWorkspaceBilling  → Luôn trả object, không crash
```

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useWorkspaceBilling.ts` | Null-safe khi activeWorkspace = null |
| `src/components/SidebarTreeNav.tsx` | Safe destructuring + empty workspace UI |
| `src/components/layout/DashboardLayout.tsx` | Safe destructuring + empty workspace CTA |

