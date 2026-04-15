

## Thêm chức năng lịch sử trò chuyện AI

### Hiện trạng
Messages chỉ lưu trong React state — mất khi refresh hoặc rời trang. Không có bảng DB nào cho AI conversations.

### Giải pháp

#### 1. Database — Tạo 2 bảng mới

**`ai_conversations`** — Mỗi cuộc trò chuyện:
- `id` (uuid PK), `user_id` (uuid, ref profiles), `title` (text — tự tạo từ message đầu tiên, cắt 50 ký tự), `created_at`, `updated_at`

**`ai_messages`** — Mỗi tin nhắn trong cuộc hội thoại:
- `id` (uuid PK), `conversation_id` (uuid, ref ai_conversations ON DELETE CASCADE), `role` (text: user/assistant), `content` (text), `created_at`

RLS: user chỉ CRUD conversations/messages của mình.

#### 2. `src/pages/AIAssistant.tsx` — Thêm sidebar lịch sử + persistence

**Sidebar lịch sử (bên trái, thu gọn được):**
- Icon `History` trên header (empty state + chat state) để toggle sidebar
- Danh sách conversations gần nhất, nhóm theo "Hôm nay", "7 ngày qua", "Tháng trước"
- Click vào conversation → load messages từ DB
- Nút "Cuộc trò chuyện mới" ở trên sidebar
- Swipe/nút xoá từng conversation

**Auto-save logic:**
- Khi user gửi message đầu tiên trong cuộc chat mới → tạo `ai_conversations` row (title = 50 ký tự đầu)
- Mỗi message (user + assistant response xong) → insert vào `ai_messages`
- Clear chat → xóa conversation khỏi DB

**Load on mount:**
- Fetch danh sách conversations (mới nhất trước, limit 50)
- Khi chọn conversation → fetch messages theo `conversation_id`

#### 3. i18n — Thêm keys
- `chatHistory`, `newChat`, `today`, `last7Days`, `lastMonth`, `deleteConversation`, `noHistory`

### Files thay đổi

| # | File | Thay đổi |
|---|------|----------|
| 1 | Migration SQL | Tạo bảng `ai_conversations`, `ai_messages` + RLS |
| 2 | `src/pages/AIAssistant.tsx` | Sidebar lịch sử, auto-save, load conversation |
| 3 | `src/lib/i18n/vi.ts` | Thêm keys lịch sử |
| 4 | `src/lib/i18n/en.ts` | Thêm keys lịch sử |

**4 thay đổi. Không thêm dependencies.**

