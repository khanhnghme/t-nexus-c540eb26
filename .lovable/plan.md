

# Hệ thống Token Credit cho AI Assistant

## Tổng quan

Chuyển từ đếm **message count** sang đếm **token thực tế** với quy đổi **1 credit = 1,000 token**. Free/Plus dùng Gemini miễn phí (không tính credit). Pro/Business/Custom tính credit theo token thật.

## Giới hạn theo gói

| Gói | Model | Credit/tháng |
|---|---|---|
| Free | Gemini Flash | Không giới hạn (miễn phí) |
| Plus | Gemini Flash | Không giới hạn (miễn phí) |
| Pro | DeepSeek V3.2 | 1,000 credit |
| Business | DeepSeek V3.2 | 2,500 credit |
| Custom | DeepSeek V3.2 | Unlimited |

## Các thay đổi

### 1. Database Migration

**Bảng `ai_daily_usage`**: Thêm cột `token_count` (integer, default 0) bên cạnh `message_count` hiện tại.

**Bảng `plan_limits`**: Thêm cột `max_ai_credits_per_month` (integer, nullable):
- `plan_free`: NULL (không áp dụng — Gemini miễn phí)
- `plan_plus`: NULL
- `plan_pro`: 1000
- `plan_business`: 2500
- `plan_custom`: NULL (unlimited)

**RPC functions mới/sửa**:
- `increment_ai_token_usage(_user_id, _date, _tokens)` — cộng token vào `token_count`
- `get_owner_ai_credit_usage_month(_owner_id, _month_start, _month_end)` — trả về tổng credit (= SUM(token_count) / 1000) của pool

### 2. Edge Function `team-assistant/index.ts`

Thay đổi lớn nhất: **không stream trực tiếp** `response.body` nữa mà phải intercept stream để đọc `usage` object từ chunk cuối cùng.

Logic mới:
1. Gọi AI API với `stream: true` + `stream_options: { include_usage: true }` (OpenAI compatible)
2. Tạo `TransformStream` để:
   - Forward mọi SSE chunk cho client (giữ streaming UX)
   - Parse chunk cuối có `usage: { prompt_tokens, completion_tokens, total_tokens }`
3. Sau khi stream kết thúc:
   - Nếu Free/Plus (Gemini): chỉ ghi `message_count` + `token_count` để tracking, **không check limit**
   - Nếu Pro/Business: tính `credits_used = ceil(total_tokens / 1000)`, check quota trước khi trả response
4. Ghi token usage vào DB qua `increment_ai_token_usage`
5. Trả header `X-AI-Credits-Used` và `X-AI-Tokens-Used` cho client

**Pre-check trước khi gọi AI** (chỉ Pro+):
- Query credit usage tháng hiện tại
- Nếu đã >= max_credits → reject ngay (giữ nguyên logic hiện tại)

**Post-stream tracking**:
- Dù Free/Plus cũng ghi token để admin có data analytics

### 3. Frontend `src/pages/AIAssistant.tsx`

Thay đổi UI usage display:
- Free/Plus: Ẩn credit bar (hoặc chỉ hiện "Miễn phí")
- Pro/Business: Hiển thị `"Đã dùng X / Y credit"` dạng progress bar
- Đọc `X-AI-Credits-Used` từ response header để cập nhật realtime
- Khi còn < 10% credit: hiển thị badge cảnh báo + gợi ý nâng cấp

State changes:
- `questionsToday` → `creditsUsed` (number)
- `maxQuestions` → `maxCredits` (number | null)
- Load usage qua RPC mới `get_owner_ai_credit_usage_month`

### 4. i18n Updates (`en.ts`, `vi.ts`)

Cập nhật tất cả chuỗi từ "X lượt/tháng" → "X credit/tháng":
- Pro: `"AI Assistant (DeepSeek V3.2): 1,000 credit/tháng"`
- Business: `"AI Assistant (DeepSeek V3.2): 2,500 credit/tháng"`
- Free/Plus: `"AI Assistant (Gemini Flash): Miễn phí"`
- Comparison table tương ứng

### 5. `workspaceQuota.ts` + `usePlanLimits.ts`

Thêm quota key mới: `workspace:limit_ai_credits`
Map sang cột `max_ai_credits_per_month`

### 6. Cập nhật Memory

Update `mem://architecture/ai-assistant-quota-system` ghi nhận chuyển sang token-based credit.

## Không thay đổi
- Model routing logic (DeepSeek cho Pro+, Gemini cho Free/Plus)
- Conversation history tables
- Admin billing dashboard
- Cột `message_count` vẫn giữ (backward compatible)
- Cột `max_ai_messages_per_month` vẫn giữ nhưng deprecated

## Thứ tự triển khai
1. DB migration (thêm cột + RPC)
2. Edge Function (intercept stream + token tracking)
3. Frontend (credit display UI)
4. i18n strings
5. Memory update

