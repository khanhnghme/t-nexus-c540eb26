

## Redesign Info Step trong Onboarding

### Layout mới (Avatar vẫn ở trên cùng)

```text
┌─────────────────────────────────────────┐
│          [Avatar + Upload]              │
├─────────────────────────────────────────┤
│ 👤 Hồ sơ cá nhân                       │
│  Họ tên          Email (readonly)       │
│  MSSV (nếu cần)                         │
├─────────────────────────────────────────┤
│ 🎓 Thông tin học vấn                    │
│  Đơn vị đào tạo (full width dropdown)  │
│  Khóa            Chuyên ngành           │
├─────────────────────────────────────────┤
│ 📞 Liên hệ & Kỹ năng                   │
│  Số điện thoại   Kỹ năng               │
│  Giới thiệu bản thân (optional)         │
├─────────────────────────────────────────┤
│  [Quay lại]              [Tiếp tục]    │
└─────────────────────────────────────────┘
```

### Thay đổi

**File: `src/components/FirstTimeOnboarding.tsx`** — chỉ phần `currentStep === 'info'` (lines 891-1041)

1. **Giữ nguyên Avatar** ở trên cùng, centered, không thay đổi

2. **Thay thế grid phẳng** (lines 931-1017) bằng 3 nhóm có tiêu đề:
   - Mỗi nhóm: `<div className="rounded-xl border bg-card p-4 space-y-3">` với heading icon + text
   - Bỏ border riêng lẻ cho từng field → dùng input đơn giản trong nhóm
   - Field dùng `bg-muted/50 rounded-lg` không border riêng

3. **Nhóm 1 — Hồ sơ cá nhân** (User icon):
   - Full Name (editable) + Email (readonly, disabled) trên 1 hàng 2 cột
   - Student ID (nếu cần) hàng riêng

4. **Nhóm 2 — Thông tin học vấn** (GraduationCap icon):
   - Institution dropdown chiếm full width
   - Year Batch + Major trên 1 hàng 2 cột

5. **Nhóm 3 — Liên hệ & Kỹ năng** (Phone icon):
   - Phone + Skills trên 1 hàng 2 cột
   - Bio textarea bên dưới

6. **Logic validation, state, handlers** — giữ nguyên hoàn toàn

### Không thay đổi
- Tất cả các step khác (language, welcome, password, plan, checkout, finish)
- State management, validation logic
- Sidebar, navigation, routing

