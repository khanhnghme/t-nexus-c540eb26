

# Tạo trang /guide/ai — Hướng dẫn AI Usage

## Thay đổi

### 1. Tạo `src/pages/AIGuide.tsx`
Trang documentation mới theo layout pattern của PricingDocs (sticky header, sidebar TOC, inline styles). Nội dung song ngữ EN/VI gồm 6 section:

1. **Giới thiệu** — AI tính theo usage thực tế, chỉ cần hiểu "credit"
2. **Cách tính credit** — 1 credit = 1000 token, làm tròn lên, tối thiểu 1 credit/lần
3. **Giới hạn theo gói** — Free/Plus miễn phí (Gemini, không đảm bảo ổn định), Pro 1000 credit, Business 2500 credit (DeepSeek V3.2)
4. **Minh bạch & kiểm soát** — Thanh usage, cập nhật realtime sau mỗi tin nhắn
5. **Mẹo tiết kiệm credit** — Viết ngắn gọn, hỏi đúng trọng tâm
6. **FAQ** — Câu hỏi thường gặp

Sidebar TOC với scroll-to navigation, mobile hamburger menu.

### 2. Cập nhật `src/App.tsx`
- Thêm lazy import `AIGuide`
- Thêm route `/guide/ai` và `guide/ai` (trong `/vi`) wrapped trong `ForceLightMode`

### 3. Cập nhật `src/pages/Guide.tsx`
Thêm link "AI Usage Guide" / "Hướng dẫn AI" vào section Documentation.

### Không thay đổi
- DB, Edge Functions, logic credit, i18n files (nội dung hardcoded trong component giống PricingDocs pattern)

