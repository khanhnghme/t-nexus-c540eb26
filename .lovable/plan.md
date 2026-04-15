

## Plan: Fix đồng bộ workspace_members khi join project

### Root Cause

Trong `JoinByCodeDialog.tsx`, hàm `handleConfirmJoin` khi user join project trực tiếp (không cần duyệt):
- Insert vào `group_members` ✅
- **KHÔNG gọi `ensure_workspace_member`** ❌

So sánh các luồng khác:
- **Accept invitation (Dashboard.tsx):** có gọi `ensure_workspace_member` ✅
- **Approve request (MemberManagementCard.tsx):** có gọi `ensure_workspace_member` ✅
- **Join by code (JoinByCodeDialog.tsx):** **THIẾU** ❌

→ User join qua code/QR thành công nhưng không được add vào workspace → không thấy project.

### Giải pháp: 3 thay đổi

#### 1. Fix `JoinByCodeDialog.tsx` — thêm `ensure_workspace_member` sau khi join

Sau khi insert `group_members` thành công (line 344-360), thêm logic:
- Fetch `workspace_id` từ group
- Gọi `ensure_workspace_member` với workspace_id đó

Tương tự cho flow approval (sau khi insert `pending_approvals`), khi approval được duyệt đã có sync rồi nên không cần thêm.

#### 2. DB trigger safeguard — auto-sync khi insert `group_members`

Tạo DB trigger `after insert on group_members` để tự động gọi upsert vào `workspace_members`. Đây là lưới an toàn cuối cùng, đảm bảo mọi luồng insert member (code, invite, manual add, future flows) đều được sync.

```sql
CREATE OR REPLACE FUNCTION public.auto_ensure_workspace_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _ws_id uuid;
BEGIN
  SELECT workspace_id INTO _ws_id FROM public.groups WHERE id = NEW.group_id;
  IF _ws_id IS NOT NULL THEN
    -- Skip if user is already workspace owner
    IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = _ws_id AND owner_id = NEW.user_id) THEN
      INSERT INTO public.workspace_members (workspace_id, user_id, role)
      VALUES (_ws_id, NEW.user_id, 'workspace:member')
      ON CONFLICT (workspace_id, user_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_auto_ensure_workspace_member
  AFTER INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.auto_ensure_workspace_member();
```

#### 3. Data fix — script repair dữ liệu hiện tại

Migration SQL để fix tất cả user đang ở project nhưng thiếu workspace:

```sql
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT DISTINCT g.workspace_id, gm.user_id, 'workspace:member'
FROM public.group_members gm
JOIN public.groups g ON g.id = gm.group_id
WHERE g.workspace_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = g.workspace_id AND w.owner_id = gm.user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = g.workspace_id AND wm.user_id = gm.user_id
  )
ON CONFLICT (workspace_id, user_id) DO NOTHING;
```

### Tổng kết

| # | Thay đổi | File/Type |
|---|----------|-----------|
| 1 | Gọi `ensure_workspace_member` sau join by code | `src/components/JoinByCodeDialog.tsx` |
| 2 | DB trigger auto-sync | Migration SQL (trigger) |
| 3 | Data fix cho dữ liệu cũ | Migration SQL (one-time insert) |

**Impact:** Fix hoàn toàn vấn đề mất đồng bộ. Trigger đảm bảo không bao giờ xảy ra lại bất kể luồng nào insert member.

