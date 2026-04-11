

## Fix: Cleanup Panel không xóa được dự án và workspace

### Nguyên nhân gốc

Hàm `deleteProject()` trong `AccountCleanupPanel.tsx` thực hiện xóa **client-side** (dùng auth token của user), nên bị chặn bởi RLS trên nhiều bảng:

- `activity_logs`: chỉ `system_admin` mới được DELETE
- `submission_history`, `task_scores`, `task_comments`, `task_assignments`: không có hoặc RLS giới hạn DELETE
- `score_appeals`, `appeal_attachments`, `notifications`, `meetings`, `meeting_attendance`, `project_messages`: thiếu DELETE policy cho project owner

Khi bất kỳ 1 bảng nào từ chối DELETE → hàm throw error → dừng toàn bộ quá trình.

### Giải pháp

**Chuyển logic xóa project sang edge function `workspace-management`** (đã có service role), thêm action `delete_project`.

#### 1. `supabase/functions/workspace-management/index.ts`

Thêm action `delete_project`:
- Validate caller là workspace owner hoặc group leader
- Dùng `supabaseAdmin` (service role) để xóa toàn bộ data liên quan theo đúng thứ tự dependency:
  - R2 files cleanup (task submissions, note attachments, project resources)
  - `appeal_attachments` → `score_appeals` → `score_adjustment_history`
  - `submission_history` → `task_note_attachments` → `task_notes`
  - `task_scores` → `task_assignments` → `task_comments` → `tasks`
  - `member_stage_scores` → `stage_weights` → `stages`
  - `member_final_scores` → `meeting_attendance` → `meeting_messages` → `meetings`
  - `pending_approvals` → `project_invitations` → `project_resources` → `resource_folders`
  - `project_messages` → `activity_logs` → `notifications`
  - `group_members` → `hidden_projects` → `canvas_pages` (nếu có)
  - `groups`

#### 2. `src/components/cleanup/AccountCleanupPanel.tsx`

Thay thế hàm `deleteProject()` client-side bằng gọi edge function:
```ts
const deleteProject = async (groupId: string) => {
  const { data, error } = await supabase.functions.invoke('workspace-management', {
    body: { action: 'delete_project', group_id: groupId },
  });
  if (error || data?.error) throw new Error(data?.error || error.message);
};
```
- Xóa import `deleteTaskFiles` (không cần nữa, edge function sẽ handle)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/workspace-management/index.ts` | Thêm action `delete_project` với service role |
| `src/components/cleanup/AccountCleanupPanel.tsx` | Thay `deleteProject()` bằng gọi edge function |

