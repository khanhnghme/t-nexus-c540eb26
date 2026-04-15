

# Thêm comment bảo vệ model + Hiển thị model đang dùng trên UI

## Thay đổi

### 1. Edge Function (`supabase/functions/team-assistant/index.ts`)
- Thêm comment IMPORTANT ngay trên block phân tầng model (dòng ~694):
```typescript
// IMPORTANT:
// Only use DeepSeek V3 standard model (deepseek-chat)
// Do NOT switch to deepseek-reasoner to avoid higher cost
```
- Thêm header `X-AI-Model` vào response (dòng 794) để frontend biết model nào đang được dùng:
```typescript
return new Response(response.body, {
  headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-AI-Model": modelName },
});
```
- Tương tự cho fallback response (thêm header `X-AI-Model: google/gemini-2.5-flash-lite`).

### 2. Frontend (`src/pages/AIAssistant.tsx`)
- Thêm state `activeModel` để lưu model đang dùng.
- Sau khi nhận response thành công, đọc header `X-AI-Model` và lưu vào state:
```typescript
const modelHeader = response.headers.get('X-AI-Model');
if (modelHeader) setActiveModel(modelHeader);
```
- Hiển thị badge model ở 2 vị trí:
  - **Empty state**: Dưới subtitle, trước input box — badge nhỏ hiện tên model (ví dụ: "DeepSeek V3" hoặc "Gemini Flash").
  - **Chat view**: Ở footer input area, bên trái — badge nhỏ text muted.
- Map tên model thành label dễ đọc:
  - `deepseek-chat` → "DeepSeek V3"
  - `google/gemini-2.5-flash-lite` → "Gemini Flash"
- Badge style: `text-[10px] text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-full`

### 3. Cập nhật memory
- Update `mem://architecture/ai-model-tier-routing` thêm quy tắc không dùng `deepseek-reasoner`.

## Không thay đổi
- Logic phân tầng model giữ nguyên.
- Quota, auth, streaming — không đổi.

