

## Plan: Giới hạn lượt nhắn tin AI phía server (5 lượt/ngày mặc định)

Hiện tại việc đếm lượt dùng AI chỉ lưu ở **localStorage** (dễ bypass). Cần chuyển sang đếm phía server với bảng DB chuyên dụng, mặc định 5 lượt/ngày, dùng model rẻ nhất.

### Thay đổi

**1. Migration: Tạo bảng `ai_daily_usage` + cột `max_ai_messages_per_day` trong `plan_limits`**

```sql
-- Bảng đếm lượt dùng AI theo ngày
CREATE TABLE public.ai_daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  message_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, usage_date)
);
ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;

-- RLS: user chỉ đọc/ghi bản thân
CREATE POLICY "Users read own usage" ON public.ai_daily_usage
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Thêm cột giới hạn vào plan_limits (mặc định 5)
ALTER TABLE public.plan_limits ADD COLUMN IF NOT EXISTS max_ai_messages_per_day integer DEFAULT 5;
```

Sau đó cập nhật giá trị cho từng plan (ví dụ Free=5, Plus=20, Pro=50, Business/Custom=null tức unlimited).

**2. Edge Function `team-assistant/index.ts`**
- Sau khi xác thực user, query `ai_daily_usage` cho ngày hôm nay
- Query `plan_limits` để lấy `max_ai_messages_per_day` theo plan của user
- Nếu `message_count >= max` → trả 429 với thông báo hết lượt
- Sau khi gọi AI thành công → UPSERT tăng `message_count`
- Đổi model sang `google/gemini-2.5-flash-lite` (model rẻ nhất)

**3. Frontend `AIAssistantPanel.tsx`**
- Bỏ logic localStorage đếm lượt cũ
- Thay bằng query `ai_daily_usage` từ Supabase để lấy số lượt đã dùng hôm nay
- Query `plan_limits` để lấy giới hạn max theo plan
- Hiển thị `remaining/max` trên thanh usage bar
- Xử lý error 429 từ server hiển thị toast "Hết lượt"

**4. Cập nhật `workspaceQuota.ts`**
- Thêm quota key `workspace:limit_ai_messages` vào `QuotaKey` type và `QUOTA_COLUMN_MAP`

**5. i18n (`en.ts`, `vi.ts`)**
- Thêm label cho giới hạn AI messages trong bảng tính năng gói cước

### Model sử dụng
Chuyển từ `google/gemini-3-flash-preview` → `google/gemini-2.5-flash-lite` (rẻ nhất, phù hợp cho trợ lý tra cứu đơn giản).

### Tổng: 1 migration + 1 data update + 3 files code + 1 deploy

