

## Plan: Di chuyển bước "Choose Plan" sau bước "Info"

### Thay đổi
Trong `src/components/FirstTimeOnboarding.tsx`:

1. **Thêm `'plan'` vào type `StepId`** và đặt vào mảng `allSteps` **sau `info`**, trước `finish`:
   - Có password: `['language', 'welcome', 'password', 'info', 'plan', 'finish']`
   - Không password: `['language', 'welcome', 'info', 'plan', 'finish']`

2. **Thêm icon cho step `plan`** vào `stepIcons` (Crown icon)

3. **Thêm state `selectedPlan`** để lưu plan người dùng chọn (mặc định `plan_free`)

4. **Thêm UI cho bước `plan`**: hiển thị 3 card (Free / Plus / Pro) với tên gói, giá, danh sách tính năng. Card được chọn có highlight border. Gói Pro có badge "Recommended".

5. **Cập nhật `handleFinish`**: lưu `user_plan` đã chọn vào bảng `profiles` khi hoàn tất onboarding.

6. **Thêm translation keys** cho step plan trong `src/locales/en.ts` và `src/locales/vi.ts`.

### Files cần sửa
- `src/components/FirstTimeOnboarding.tsx`
- `src/locales/en.ts`
- `src/locales/vi.ts`

