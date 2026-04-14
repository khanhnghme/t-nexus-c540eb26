

## Plan: Chuyển AI Assistant sang trang riêng + link sidebar dưới Tổng quan

### Tóm tắt
1. Tạo trang `/ai-assistant` riêng biệt (full-page chat, tái sử dụng logic từ `AIAssistantPanel.tsx`)
2. Thêm link "Trợ lý AI" vào sidebar ngay dưới "Tổng quan" (Overview), cả expanded và collapsed mode
3. Xóa floating `AIAssistantButton` khỏi `DashboardLayout.tsx`
4. Giữ nguyên logic tính usage theo owner pool (đã implement)

### Chi tiết kỹ thuật

**1. Tạo `src/pages/AIAssistant.tsx`**
- Full-page layout: sidebar trái hiển thị usage bar (owner pool: `get_owner_ai_usage_today`), main area là giao diện chat
- Tái sử dụng toàn bộ logic từ `AIAssistantPanel.tsx`: messages state, send handler, markdown rendering, word limit, usage tracking
- Bỏ Sheet/drawer wrapper → render trực tiếp trong page content
- Hiển thị thanh usage: "Đã dùng X / Y lượt (toàn workspace)" dựa trên owner pool

**2. Cập nhật `src/components/SidebarTreeNav.tsx`**
- Import icon `Sparkles` từ lucide-react
- **Expanded mode** (~line 236, sau Overview): Thêm link `/ai-assistant` với icon Sparkles
- **Collapsed mode** (~line 177, sau Overview): Thêm `TreeItemCollapsed` cho `/ai-assistant`

**3. Cập nhật `src/App.tsx`**
- Lazy import `AIAssistant` page
- Thêm route `/ai-assistant` trong protected layout (cạnh `/dashboard`)

**4. Cập nhật `src/components/layout/DashboardLayout.tsx`**
- Xóa import `AIAssistantButton` (line 54)
- Xóa render `<AIAssistantButton ... />` (line 545-549)

**5. Cập nhật i18n (`en.ts`, `vi.ts`)**
- Sidebar: `aiAssistant: 'AI Assistant'` / `aiAssistant: 'Trợ lý AI'`

### Tổng: 1 file mới + 4 files sửa

