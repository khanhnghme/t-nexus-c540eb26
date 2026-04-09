

## Plan: Thiết kế lại Onboarding thành Full-Page (giữ logic password cũ)

### Luồng

```text
Login → Dashboard detect chưa onboarding → Redirect /onboarding
  → Language → Welcome → Password (CHỈ KHI mustChangePassword=true) → Info → Plan
    ├─ Free → Finish → Save + Redirect /dashboard
    └─ Trả phí → Save tạm (plan_free, onboarding chưa xong)
        → Redirect /checkout?plan=xxx&from=onboarding
        → Thanh toán OK → Redirect /onboarding?from=checkout_success → Finish
        → Cancel → Quay lại /onboarding bước Plan (vẫn plan_free)
```

### Thay đổi

**1. `src/pages/Onboarding.tsx`** (tạo mới)
- Trang full-screen render `<FirstTimeOnboarding />`
- Nếu `profile.onboarding_completed` → redirect `/dashboard`

**2. `src/components/FirstTimeOnboarding.tsx`** (refactor lớn)
- Xoá `Dialog` wrapper → layout full-screen `min-h-screen`
- Xoá prop `open`
- **Giữ nguyên logic password**: `allSteps` vẫn dùng điều kiện `mustChangePassword` như hiện tại
- Thêm animation chuyển bước: wrap content với `key={currentStep}` + CSS `animate-fade-in`
- Bước Plan: gói trả phí → lưu profile tạm (`plan_free`, `onboarding_completed: false`) → redirect `/checkout?plan=xxx&from=onboarding`
- Mount: check URL param `from=checkout_success` → auto nhảy bước Finish
- `handleFinish`: luôn lưu `user_plan: 'plan_free'` (webhook cập nhật gói trả phí)

**3. `src/App.tsx`** — thêm route `/onboarding`

**4. `src/pages/Dashboard.tsx`** — xoá popup `<FirstTimeOnboarding>`, redirect `/onboarding` nếu chưa hoàn tất

**5. `src/pages/Checkout.tsx`** — khi `from=onboarding` + thanh toán OK → redirect `/onboarding?from=checkout_success`

### Files
- `src/pages/Onboarding.tsx` (mới)
- `src/components/FirstTimeOnboarding.tsx` (refactor)
- `src/App.tsx` (route)
- `src/pages/Dashboard.tsx` (redirect)
- `src/pages/Checkout.tsx` (redirect logic)

