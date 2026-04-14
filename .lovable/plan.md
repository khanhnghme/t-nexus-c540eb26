

## Plan: Fix AI Assistant bug + Redesign input area

### Bug gốc (chặn gửi tin nhắn)

**File**: `supabase/functions/team-assistant/index.ts`, line 739 và 745

Biến `today` không được khai báo. Cả `try` và `catch` đều reference `today`, gây ReferenceError, rơi vào outer catch → trả 500 error cho client.

```
// Line 739 — today KHÔNG TỒN TẠI
await supabase.rpc('increment_ai_usage', { _user_id: userId, _date: today });
// Line 745 — cũng dùng today
{ user_id: userId, usage_date: today, ... }
```

**Fix**: Thêm `const today = monthEnd;` (hoặc `now.toISOString().slice(0, 10)`) sau line 552, trước khi sử dụng.

### Redesign input area

**File**: `src/pages/AIAssistant.tsx`

- Thay `h-[calc(100vh-56px)]` thành tính toán chính xác hơn, đảm bảo input area nằm sát bottom
- Input area: thêm `pb-safe` padding cho mobile, giảm padding bottom
- Cải thiện visual: border-top rõ hơn, input field gọn hơn

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/team-assistant/index.ts` | Thêm `const today = monthEnd;` sau line 552 |
| `src/pages/AIAssistant.tsx` | Redesign input area layout |

### Rủi ro
- **Rất thấp** — fix 1 dòng biến + chỉnh CSS layout

