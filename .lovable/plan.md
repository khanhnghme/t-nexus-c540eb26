

## Phase 6 — Giai đoạn 4/4: Invite Member từ Member Block

### Mục tiêu
Thêm nút "Mời thành viên" vào header của Member Block, mở dialog mời khách (reuse `ProjectGuestInviteDialog` đã có). Chỉ hiển thị nút khi user có quyền (`editable` từ context). Cập nhật plan.md ghi nhận Phase 6 hoàn tất.

### Hiện trạng
- Stage 1-3 hoàn thành: read-only list, realtime, grid/list toggle
- `ProjectGuestInviteDialog` đã có sẵn, nhận `groupId` + `groupName`
- `TaskBlockContext` cung cấp `editable` flag

### Hành động cụ thể

**1. Cập nhật `src/components/canvas/blocks/MemberBlock.tsx`**
- Import `ProjectGuestInviteDialog`
- Fetch `groupName` từ bảng `groups` (query thêm 1 lần khi mount) hoặc truyền qua context
- Trong header, nếu `editable === true` → render nút `UserPlus` icon làm trigger cho `ProjectGuestInviteDialog`
- Nút đặt cạnh toggle view, trước count badge

**2. Cập nhật `src/components/canvas/blocks/TaskBlockContext.tsx`**
- Thêm `groupName` vào context value (optional, để tránh query thừa trong MemberBlock)

**3. Cập nhật nơi cung cấp `TaskBlockProvider`** 
- Truyền thêm `groupName` vào provider

**4. Cập nhật `.lovable/plan.md`**
- Ghi nhận Phase 6 hoàn tất

### Chi tiết kỹ thuật

```text
Header khi editable=true:
┌──────────────────────────────────────────────────┐
│ 👥 Thành viên dự án   [+Mời] [List|Grid] [count]│
└──────────────────────────────────────────────────┘

[+Mời] = ProjectGuestInviteDialog trigger (UserPlus icon button)
         Props: groupId từ context, groupName từ context
```

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/blocks/TaskBlockContext.tsx` | Thêm `groupName` vào context |
| Nơi render `TaskBlockProvider` | Truyền thêm `groupName` |
| `src/components/canvas/blocks/MemberBlock.tsx` | Thêm nút invite, import dialog |
| `.lovable/plan.md` | Phase 6 hoàn tất |

### Không làm trong giai đoạn này
- Quản lý role từ block (remove member, change role) — ngoài scope Phase 6

