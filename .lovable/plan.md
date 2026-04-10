

## Kế hoạch: Cập nhật plan realtime + AI welcome images trên finish step

### Vấn đề 1: Plan chưa cập nhật ở finish step

Khi user quay về `/onboarding` sau thanh toán thành công, `profile.user_plan` có thể chưa được refresh. Component `Onboarding.tsx` truyền `userPlan={profile.user_plan}` nhưng không gọi `refreshProfile()` khi mount lại.

**Fix**: Trong `Onboarding.tsx`, gọi `refreshProfile()` khi component mount nếu `sessionStorage` có flag `checkout_from === 'onboarding'` (nghĩa là vừa quay về từ checkout). Đồng thời trong `FirstTimeOnboarding.tsx`, cập nhật `getPlanLabelLocal()` và `getPlanColorLocal()` để dùng `userPlan` prop trực tiếp (đã đúng), và thêm `plan_business` vào switch case (hiện thiếu).

### Vấn đề 2: Ảnh welcome khác nhau cho mỗi plan

Hiện tại finish step dùng 1 ảnh tĩnh `completeImg` cho mọi plan. Yêu cầu: tạo 4 ảnh AI phong cách hoạt hình 3D cho 4 plan (Free, Plus, Pro, Business).

**Cách làm**:
- Dùng Lovable AI image generation tạo 4 ảnh 3D cartoon (mỗi plan 1 theme riêng)
- Lưu vào `src/assets/` với tên `onboarding-complete-free.png`, `onboarding-complete-plus.png`, etc.
- Trong finish step, chọn ảnh dựa theo `userPlan`

### Thay đổi cụ thể

**1. `src/pages/Onboarding.tsx`**
- Thêm `useEffect` gọi `refreshProfile()` khi mount nếu `sessionStorage.getItem('checkout_from') === 'onboarding'`

**2. `src/components/FirstTimeOnboarding.tsx`**
- Fix `getPlanColorLocal()`: thêm case `plan_business`
- Fix `getPlanLabelLocal()`: thêm case `plan_business`  
- Thay `completeImg` bằng logic chọn ảnh theo plan:
```typescript
const finishImage = {
  plan_free: completeImgFree,
  plan_plus: completeImgPlus,
  plan_pro: completeImgPro,
  plan_business: completeImgBusiness,
}[userPlan || 'plan_free'] || completeImgFree;
```

**3. Tạo 4 ảnh AI** (3D cartoon style)
- Free: Nhân vật hoạt hình 3D vui vẻ, bắt đầu hành trình
- Plus: Nhân vật với huy hiệu xanh dương, bay lên
- Pro: Nhân vật với áo giáp tím, siêu năng lực
- Business: Nhân vật vàng gold, vương miện, đỉnh cao

### Files cần sửa/tạo

| File | Thay đổi |
|------|----------|
| `src/pages/Onboarding.tsx` | Thêm refreshProfile khi quay từ checkout |
| `src/components/FirstTimeOnboarding.tsx` | Fix plan display + dynamic image |
| `src/assets/onboarding-complete-*.png` x4 | Tạo mới bằng AI |

