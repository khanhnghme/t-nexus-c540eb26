

## Phase 6 — Giai doan 2/4: Realtime Subscribe cho Member Block

### Muc tieu
Tu dong cap nhat danh sach thanh vien khi co thay doi (them/xoa member) ma khong can reload trang.

### Hien trang
- Stage 1/4 hoan thanh: MemberBlock hien thi read-only, fetch 1 lan khi mount
- Khi co nguoi join/leave project, block khong tu cap nhat

### Hanh dong cu the

**1. Tao migration: enable realtime cho bang `group_members`**
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;`

**2. Cap nhat `src/components/canvas/blocks/MemberBlock.tsx`**
- Sau khi fetch xong, subscribe realtime channel `group_members` filtered theo `group_id`
- Khi nhan event INSERT/DELETE → goi lai `fetchMembers()` de refresh danh sach
- Cleanup: unsubscribe khi component unmount

### Chi tiet ky thuat

```text
MemberListRenderer:
  useEffect #1 → fetchMembers() (giu nguyen)
  
  useEffect #2 → realtime subscribe
    const channel = supabase
      .channel(`members-${groupId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_members',
        filter: `group_id=eq.${groupId}`
      }, () => fetchMembers())
      .subscribe()

    return () => supabase.removeChannel(channel)
```

### Khong lam trong giai doan nay
- Grid view toggle (giai doan 3)
- Invite member tu block (giai doan 4)

### Files thay doi

| File | Thay doi |
|------|----------|
| `src/components/canvas/blocks/MemberBlock.tsx` | Them realtime subscription |
| Migration SQL | Enable realtime cho `group_members` |

