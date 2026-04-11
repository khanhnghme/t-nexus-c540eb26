

## Phase 6 — Giai đoạn 1/4: Custom Block `/member` — Khung Block + Hiển thị danh sách thành viên (Read-only)

### Bối cảnh
Phase 5 đã hoàn thành custom block `/task` với đầy đủ CRUD, Kanban view, inline edit. Phase 6 tập trung vào block `/member` — hiển thị danh sách thành viên dự án trực tiếp trong canvas.

Theo roadmap, `/member` block là **read-only** (không cho sửa member từ canvas, chỉ hiển thị). Đây là block nhẹ hơn `/task` rất nhiều.

### Mục tiêu giai đoạn 1/4
Tạo custom block `memberList` trong BlockNote, fetch và hiển thị danh sách thành viên (avatar, tên, role) từ bảng `group_members` + `profiles`. Đăng ký slash command `/member`.

### Hành động cụ thể

**1. Tạo `src/components/canvas/blocks/MemberBlock.tsx`**
- Custom block spec `memberList` dùng `createReactBlockSpec`
- Sử dụng `useTaskBlockContext()` (đổi tên thành context chung hoặc reuse — context đã cung cấp `groupId`)
- Fetch members: `supabase.from('group_members').select('user_id, role, profiles(full_name, avatar_url)').eq('group_id', groupId)`
- Render dạng grid/list: avatar (fallback initials), full_name, role badge
- Loading skeleton khi đang fetch
- Empty state khi chưa có thành viên

**2. Cập nhật `src/components/canvas/CanvasEditor.tsx`**
- Import `MemberListBlock` và đăng ký vào schema (`memberList: MemberListBlock()`)

**3. Không thay đổi DB**
- Bảng `group_members` và `profiles` đã có đủ dữ liệu và RLS policies
- Block này chỉ SELECT, không cần thêm policies

### Chi tiết kỹ thuật

```text
CanvasEditor schema:
  blockSpecs: {
    ...defaultBlockSpecs,
    taskList: TaskListBlock(),
    memberList: MemberListBlock(),   // ← NEW
  }

MemberListRenderer:
  useTaskBlockContext() → groupId
  useEffect → supabase
    .from("group_members")
    .select("user_id, role, profiles(full_name, avatar_url)")
    .eq("group_id", groupId)

  Render:
  ┌─────────────────────────────────────────┐
  │ 👥 Thành viên dự án          [count]    │
  ├─────────────────────────────────────────┤
  │ [Avatar] Nguyễn Văn A    Owner          │
  │ [Avatar] Trần Thị B      Admin          │
  │ [Avatar] Lê Văn C        Member         │
  └─────────────────────────────────────────┘
```

### Không làm trong giai đoạn này
- Realtime subscribe (giai đoạn 2)
- Grid view toggle (giai đoạn 3)
- Invite member từ block (giai đoạn 4)

### Files thay đổi

| File | Thay đổi |
|------|--------|
| `src/components/canvas/blocks/MemberBlock.tsx` | Tạo mới — custom block hiển thị members |
| `src/components/canvas/CanvasEditor.tsx` | Đăng ký `memberList` block vào schema |

### Rủi ro
- Context hiện tại tên `TaskBlockContext` — cần reuse (không đổi tên để tránh breaking change, vì context chỉ cung cấp `groupId` + `editable` — đủ dùng cho member block)

