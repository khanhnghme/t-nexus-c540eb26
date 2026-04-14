

## Plan: Chuyển logic AI usage sang tính theo tổng workspace owner

### Thay đổi logic
Hiện tại: Đếm lượt AI **theo từng user riêng lẻ** → Mới: Đếm **tổng lượt sử dụng của TẤT CẢ thành viên** thuộc các workspace mà owner sở hữu, so sánh với giới hạn plan của owner đó.

Ví dụ: Owner gói Business (200 lượt/ngày) có 2 workspace, tổng 10 thành viên → cả 10 người chia sẻ 200 lượt/ngày.

### Chi tiết kỹ thuật

**1. Migration: Tạo DB function `get_owner_ai_usage_today`**
```sql
-- Tính tổng lượt AI hôm nay của tất cả thành viên thuộc workspace của owner
CREATE FUNCTION get_owner_ai_usage_today(_owner_id uuid, _date date)
RETURNS integer
```
Logic: Lấy tất cả user_id thuộc workspace mà owner sở hữu (owner + workspace_members) → SUM message_count từ `ai_daily_usage` cho ngày _date.

**2. Migration: Tạo DB function `get_user_workspace_owner`**
```sql
-- Tìm owner_id của workspace mà user đang thuộc
CREATE FUNCTION get_user_workspace_owner(_user_id uuid)
RETURNS uuid
```
Logic: Nếu user là owner workspace → trả chính họ. Nếu là member → trả owner_id của workspace đầu tiên.

**3. Cập nhật `plan_limits` data**
- `plan_business`: `max_ai_messages_per_day = 200`
- `plan_custom`: `max_ai_messages_per_day = 200`

**4. Edge Function `team-assistant/index.ts`**
- Thay logic check limit: Tìm owner_id từ user → lấy plan của owner → đếm tổng usage toàn workspace → so sánh với limit
- Vẫn ghi usage vào `ai_daily_usage` theo user_id gốc (để biết ai dùng bao nhiêu)

**5. Frontend `AIAssistantPanel.tsx`**
- Cập nhật logic fetch usage: Thay vì chỉ query usage riêng user, gọi RPC `get_owner_ai_usage_today` để lấy tổng
- Lấy plan limit từ owner's plan thay vì user's plan
- Hiển thị `tổng đã dùng / giới hạn owner`

### Tổng: 1 migration (2 functions) + 1 data update + 2 files code

