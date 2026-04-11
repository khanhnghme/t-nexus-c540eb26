

## Redesign AI Assistant — Clean, Minimal, Focused

### Thay đổi chính

**1. Loại bỏ noise**
- Xóa toàn bộ `SUGGESTED_QUESTIONS` section (empty state)
- Xóa nút "Thử lại câu hỏi" (nếu có)
- Xóa decorative shapes (spinning circles trong header)
- Xóa hero bounce/pulse/glow animations
- Giảm CSS animations còn tối thiểu (chỉ giữ typing dots + fade-in)

**2. Header — Compact & Clean**
- Bỏ gradient background phức tạp → solid `bg-background` + subtle border
- Bỏ decorative circles, ring effects
- Avatar nhỏ hơn (h-8 w-8), không ring/glow
- Online indicator đơn giản hơn
- Text color dùng foreground thay vì primary-foreground

**3. Empty State — Minimal**
- Chỉ hiện: Avatar nhỏ + "Hỏi bất cứ điều gì" (1 dòng text)
- Không có suggested questions, không hero section, không emoji

**4. Scope + Usage bar — Simplify**
- Gộp scope indicator và usage vào 1 dòng nhỏ gọn
- Bỏ colored backgrounds (blue-50, amber-50) → text thuần với icon
- Usage bar giữ nhưng nhỏ hơn

**5. Message bubbles — Cleaner**
- Giữ nguyên layout (user bên phải, AI bên trái)
- Giảm shadow, border → cleaner look
- Typing indicator giữ dots, bỏ "Đang suy nghĩ..." text và sparkle spin

**6. Input area — Simpler**
- Bỏ disclaimer section (AlertTriangle warning)
- Giữ textarea + send button
- Bỏ hint text "Enter để gửi" → chỉ hiện khi hết lượt

**7. CSS — Cắt giảm mạnh**
- Xóa ~80% custom keyframes (hero-enter, hero-bounce, pulse-glow, card-enter, decor-rotate, sparkle-spin)
- Giữ: typing-wave, shimmer (thinking), fade-in

### File cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/ai/AIAssistantPanel.tsx` | Redesign toàn bộ UI + xóa animations thừa |

