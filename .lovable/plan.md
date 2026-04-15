

## Redesign trang /ai-assistant theo phong cách Notion AI

### Tham chiếu
Ảnh đính kèm cho thấy bố cục Notion AI:
- **Empty state**: Logo lớn ở giữa, câu hỏi chào mừng "Hôm nay tôi có thể giúp gì cho bạn?", ô input ở giữa trang (không phải dưới cùng), 4 suggestion cards bên dưới (2x2 grid)
- **Chat state**: Messages đơn giản không avatar cho AI, user message nhỏ gọn bên phải, input cố định ở dưới

### Thay đổi

#### `src/pages/AIAssistant.tsx` — Redesign toàn bộ layout

**Empty state (chưa có tin nhắn):**
- Bỏ header bar cố định phía trên
- Logo T-Nexus lớn ở giữa trang (h-16 w-16)
- Tiêu đề lớn: "Hôm nay tôi có thể giúp gì cho bạn?"
- Ô input nằm **giữa trang** (không dính dưới), border rounded-xl, placeholder "Làm mọi việc với AI..."
- Usage bar nhỏ nằm trong input area (góc phải)
- 4 suggestion cards (2x2 grid) bên dưới input: gợi ý nhanh như "Tóm tắt nội dung dự án", "Lên kế hoạch công việc", "Phân tích tiến độ nhóm", "Viết báo cáo nhanh"
- Click suggestion → tự gửi message

**Chat state (có tin nhắn):**
- Header nhỏ gọn: chỉ hiện "T-Nexus AI" breadcrumb-style bên trái, nút trash bên phải
- Messages: user bubble nhỏ gọn bên phải (bg rounded pill), AI response bên trái không có avatar (plain text với markdown)
- Input cố định dưới cùng, cùng style rounded-xl như empty state
- Bỏ avatar cho AI messages trong chat (giống Notion — chỉ text)

**Cấu trúc chung:**
- Giữ nguyên toàn bộ logic: streaming, usage tracking, word limit, sendMessage
- Chỉ thay đổi JSX render

#### i18n — Thêm keys mới
- `aiGreeting`: "Hôm nay tôi có thể giúp gì cho bạn?"
- `aiPlaceholder`: "Làm mọi việc với AI..."
- 4 suggestion labels + descriptions

### Files thay đổi

| # | File | Thay đổi |
|---|------|----------|
| 1 | `src/pages/AIAssistant.tsx` | Redesign layout empty state + chat state |
| 2 | `src/lib/i18n/vi.ts` | Thêm AI suggestion keys |
| 3 | `src/lib/i18n/en.ts` | Thêm AI suggestion keys |

**3 files. Không thêm dependencies.**

