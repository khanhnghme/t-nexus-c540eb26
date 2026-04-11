

## Phase 3 — Giai đoạn 1/4: Mode Selector UI Component

### Mục tiêu
Khi user bấm "Tạo dự án" trên trang Groups, hiện bước chọn mode (Basic / Custom) trước khi mở form tạo project. Basic → mở dialog cũ. Custom → navigate tới `/create-custom`.

### Hiện trạng
- ✅ Phase 2 hoàn tất: CRUD + auto-save + error handling
- ✅ `/create-custom` page hoạt động đầy đủ
- ✅ `GroupDetail` phân luồng theo `project_mode`
- ❌ Bấm "Tạo dự án" → mở thẳng dialog Basic, không có lựa chọn mode
- ❌ Chưa có component Mode Selector

### Hành động cụ thể

**1. Tạo `src/components/ProjectModeSelector.tsx`** — Component chọn mode

- 2 cards ngang nhau: **Basic** và **Custom**
- Basic card: icon Layers/ListChecks, mô tả "Quản lý task, stage, deadline theo flow chuẩn"
- Custom card: icon FileText/Palette, mô tả "Canvas tự do với block editor"
- Props: `onSelectBasic: () => void`, `onSelectCustom: () => void`
- Styling: hover effect, selected state, responsive

**2. Cập nhật `src/pages/Groups.tsx`** — Thêm bước chọn mode

- Thêm state `showModeSelector: boolean` (default false)
- Khi bấm "Tạo dự án":
  - Nếu `showModeSelector === false` → set `showModeSelector = true`, mở dialog hiện ModeSelector
  - Chọn Basic → đóng mode selector, mở dialog tạo project cũ (`isDialogOpen = true`)
  - Chọn Custom → đóng dialog, navigate tới `/create-custom`
- Flow: Click CTA → Mode Selector dialog → chọn mode → tiếp tục

**3. Đảm bảo không ảnh hưởng flow cũ**

- Dialog tạo project Basic giữ nguyên 100% logic hiện tại
- Chỉ thêm 1 bước trung gian (mode selector) trước khi mở dialog cũ
- Permission check `canCreateProject` vẫn áp dụng

### Output
- Bấm "Tạo dự án" → hiện 2 cards chọn mode
- Chọn Basic → mở dialog tạo project như cũ
- Chọn Custom → navigate `/create-custom`
- UI đẹp, responsive, có animation nhẹ

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/ProjectModeSelector.tsx` | **Mới** — Component 2 cards chọn Basic/Custom |
| `src/pages/Groups.tsx` | Thêm state + dialog mode selector trước dialog tạo project |

