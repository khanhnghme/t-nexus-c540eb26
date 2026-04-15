

# Fix: Credit không cập nhật sau khi dùng AI

## Nguyên nhân gốc

### Frontend (chính)
`loadUsage` useEffect chỉ chạy **1 lần khi mount** (deps: `[user?.id, activeWorkspace?.id]`). Sau khi gửi tin nhắn và stream kết thúc, frontend **không bao giờ fetch lại** credit usage → UI đứng im.

### Backend (phụ — chỉ ảnh hưởng Gemini)
Gemini (Lovable AI Gateway) không trả `usage.total_tokens` trong SSE stream → `totalTokens` luôn = 0 cho Free/Plus users. Nhưng vì Free/Plus không giới hạn credit nên không ảnh hưởng nghiêm trọng. DeepSeek (Pro/Business) hoạt động đúng — DB ghi nhận `token_count: 53469`.

## Thay đổi

### 1. `src/pages/AIAssistant.tsx` — Re-fetch credits sau mỗi message

Extract `loadUsage` thành một hàm callback reusable. Sau khi stream hoàn tất thành công (dòng ~332, sau `saveMessage`), gọi lại `loadUsage()` để refresh credit bar.

```typescript
// Thay useEffect loadUsage thành useCallback
const loadUsage = useCallback(async () => {
  // ... existing logic ...
}, [user?.id, activeWorkspace?.id]);

// Mount effect
useEffect(() => { loadUsage(); }, [loadUsage]);

// Trong sendMessage, sau khi stream xong:
if (assistantContent) {
  await saveMessage(convId, 'assistant', assistantContent);
  // ... update conversation ...
  loadUsage(); // ← RE-FETCH credits
}
```

### 2. `supabase/functions/team-assistant/index.ts` — Fallback token estimation cho Gemini

Khi `totalTokens === 0` sau stream (Gemini không trả usage), ước tính dựa trên text length:
- `estimatedTokens = Math.ceil((inputText.length + outputText.length) / 4)`
- Ghi vào DB để admin có analytics data (dù Free/Plus không bị limit)

Thêm logic trong `flush()`:
```typescript
async flush() {
  let tokensToRecord = totalTokens;
  if (tokensToRecord === 0) {
    // Rough estimate: ~4 chars per token
    tokensToRecord = Math.ceil(totalCharsProcessed / 4);
  }
  await supabase.rpc('increment_ai_token_usage', { ... _tokens: tokensToRecord });
}
```

Cần accumulate `totalCharsProcessed` trong `transform()`.

## Không thay đổi
- DB schema, RPC functions — đã đúng
- Credit limit check logic — đã đúng
- Pre-check quota — đã đúng

## Ưu tiên
1. Fix frontend re-fetch (fix chính, giải quyết ngay vấn đề UI)
2. Fix Gemini token estimation (nice-to-have cho analytics)

