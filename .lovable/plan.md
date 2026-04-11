

## Phase 6 — Hoàn tất: Custom Block `/member`

### Tổng kết
Phase 6 đã hoàn thành đầy đủ 4 giai đoạn:

| Giai đoạn | Nội dung | Trạng thái |
|-----------|----------|------------|
| 1/4 | Read-only member list block | ✅ Hoàn thành |
| 2/4 | Realtime subscription | ✅ Hoàn thành |
| 3/4 | Grid/List view toggle | ✅ Hoàn thành |
| 4/4 | Invite member từ block | ✅ Hoàn thành |

### Files đã thay đổi
- `src/components/canvas/blocks/MemberBlock.tsx` — Custom block hiển thị members với list/grid toggle, realtime, invite
- `src/components/canvas/blocks/TaskBlockContext.tsx` — Context cung cấp groupId + editable
- `src/components/canvas/CanvasEditor.tsx` — Đăng ký memberList block vào schema
