

# Cập nhật kế hoạch: Phân tầng Model AI theo Plan

## Quy tắc mới

| Plan | Model | Provider |
|---|---|---|
| **Free & Plus** | `google/gemini-2.5-flash-lite` | Lovable AI Gateway (giữ nguyên) |
| **Pro & Business** | `deepseek-chat` (V3) | DeepSeek API trực tiếp |

## Thay đổi kỹ thuật

### File: `supabase/functions/team-assistant/index.ts`

**Vị trí**: Sau khi có `ownerPlan` (dòng 569-577), trước khi gọi API (dòng 694-709).

**Logic mới** (~15 dòng):

```typescript
// Determine model and endpoint based on owner's plan
const isPro = ownerPlan === 'plan_pro' || ownerPlan === 'plan_business' || ownerPlan === 'plan_custom';

let apiUrl: string;
let apiKey: string;
let modelName: string;

if (isPro) {
  apiUrl = "https://api.deepseek.com/chat/completions";
  apiKey = Deno.env.get("DEEPSEEK_API_KEY") || "";
  modelName = "deepseek-chat";
} else {
  apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
  apiKey = Deno.env.get("LOVABLE_API_KEY") || "";
  modelName = "google/gemini-2.5-flash-lite";
}
```

Sau đó thay thế hardcoded URL/model tại dòng 694-708 bằng các biến trên.

### Secret mới
- Thêm `DEEPSEEK_API_KEY` vào Supabase secrets (user cung cấp key).

### Fallback
- Nếu `DEEPSEEK_API_KEY` rỗng hoặc DeepSeek trả lỗi 5xx, tự động fallback về Lovable Gateway để tránh gián đoạn.

## Không thay đổi
- Frontend (`AIAssistant.tsx`) — không đổi gì (SSE format giống nhau).
- Quota logic — giữ nguyên hoàn toàn.
- System prompt, project context — giữ nguyên.

## Checklist triển khai
1. User cung cấp DeepSeek API key
2. Lưu `DEEPSEEK_API_KEY` vào secrets
3. Cập nhật `team-assistant/index.ts` với logic phân tầng model
4. Deploy edge function
5. Test: tài khoản Free/Plus → vẫn dùng Gemini
6. Test: tài khoản Pro/Business → dùng DeepSeek
7. Test fallback khi DeepSeek lỗi

