

## Nâng cấp chức năng Dọn dẹp (Cleanup) trên trang Service Plan

### Hiện trạng
- Nút "Dọn dẹp" trên banner chỉ dẫn đến tab "Mức sử dụng" (`/service-plan?tab=usage`) — nơi hiển thị số liệu nhưng **không có bất kỳ hành động xóa nào**
- Người dùng không thể xóa workspace hay project từ trang này
- Không có giao diện cho biết "cần giảm bao nhiêu" để thoát read-only

### Kế hoạch

#### 1. Tạo component `AccountCleanupPanel`
**File mới:** `src/components/cleanup/AccountCleanupPanel.tsx`

Giao diện gồm 3 phần chính:

**A. Tổng quan hạn mức (Summary Bar)**
- 4 thanh progress: Workspace, Projects, Members, Storage
- Mỗi thanh hiển thị: `hiện tại / hạn mức Free` + trạng thái (🔴 vượt, 🟢 đạt)
- Badge tổng: "Cần giảm X workspace, Y project, Z MB để mở khóa"

**B. Danh sách Workspace (có checkbox xóa)**
- Liệt kê tất cả workspace người dùng sở hữu
- Mỗi WS hiển thị: tên, số project, số member, dung lượng
- Checkbox để chọn xóa cả workspace
- Nút expand → hiển thị danh sách project bên trong

**C. Danh sách Project (chọn xóa từng cái)**
- Khi expand 1 WS → hiển thị các project trong WS đó
- Checkbox từng project
- Hiển thị: tên, số task, dung lượng file

**D. Preview kết quả (Live calculation)**
- Khi user tick chọn WS/project, panel phía dưới cập nhật real-time:
  - "Sau khi xóa: X workspace, Y project, Z MB"
  - So sánh với hạn mức Free → hiển thị "Đủ điều kiện mở khóa ✅" hoặc "Chưa đủ, cần giảm thêm ❌"

**E. Nút "Xóa đã chọn"**
- Confirm dialog: liệt kê những gì sẽ bị xóa
- Nhập "XÁC NHẬN" để thực hiện
- Gọi edge function `workspace-management` (action: delete_workspace) cho WS
- Gọi delete trực tiếp cho project (như GroupDetail.handleDeleteGroup)
- Sau khi xóa xong → refresh data → cập nhật lại summary

#### 2. Tích hợp vào trang ServicePlan
**File:** `src/pages/ServicePlan.tsx`

- Thêm `AccountCleanupPanel` vào cuối tab "usage"
- Chỉ hiển thị khi `isReadOnly === true` hoặc `isOverLimits === true`

#### 3. Fetch dữ liệu chi tiết
- Workspace list: đã có từ `fetchUsages()`
- Project list per WS: query `groups` where `workspace_id = ws.id` → lấy tên, id
- Storage per project: query `get_workspace_storage_usage` (đã có) + tính per-project bằng cách sum `project_resources.file_size` + `submission_history.file_size` + `task_note_attachments.file_size`

#### 4. Logic xóa project
Tái sử dụng pattern từ `GroupDetail.handleDeleteGroup`:
- Xóa submission_history, tasks, stages, member_stage_scores, pending_approvals, group_members, activity_logs, groups
- Gọi `deleteTaskFiles()` cho mỗi task (xóa R2 files)

#### 5. Logic xóa workspace  
- Gọi `supabase.functions.invoke('workspace-management', { body: { action: 'delete_workspace', workspace_id } })`

### Files cần tạo/sửa

| File | Hành động |
|------|-----------|
| `src/components/cleanup/AccountCleanupPanel.tsx` | Tạo mới — UI dọn dẹp với checkbox WS/project + live preview |
| `src/pages/ServicePlan.tsx` | Thêm `AccountCleanupPanel` vào tab usage |

### Không thay đổi
- `useAccountReadOnly`, `useAccountLimitsCheck` — đã đúng
- `ReadOnlyBanner` — chỉ dẫn link, không cần sửa
- Edge function `workspace-management` — đã hỗ trợ delete_workspace
- `storageCleanup.ts` — tái sử dụng `deleteTaskFiles()`

