

## Plan: Nâng cấp UI Plan Selection + Welcome Offer toàn hệ thống

### 3 thay đổi chính

### 1. Plan cards hiển thị full features (không dùng ScrollArea)
**File**: `src/components/FirstTimeOnboarding.tsx`
- Xoá `<ScrollArea className="flex-1 max-h-[180px]">` bọc quanh features list → hiển thị toàn bộ features dài xuống tự nhiên
- Thêm link guide pricing giống trang Pricing/Upgrade: `📋 Hướng dẫn thanh toán...` + link `/guide/pricing` vào dưới planNote

### 2. Toggle Monthly/Yearly ngay tại bước Plan
**File**: `src/components/FirstTimeOnboarding.tsx`
- Thêm toggle Monthly/Yearly phía trên grid plan cards (giống checkout)
- Giá hiển thị trên card thay đổi theo cycle đã chọn
- State `cycle` đã có sẵn, chỉ cần dùng tại bước Plan (hiện chỉ dùng ở checkout)
- Hiển thị: `$4.8/mo` hoặc `$48/yr` tùy cycle

### 3. Welcome Offer — Ưu đãi chào mừng lần đầu
**Giá welcome** (hardcode):
- Plus: $3.9/mo, $39/yr
- Pro: $9.9/mo, $99/yr  
- Business: $21.9/mo, $219/yr

**Logic check first-time buyer**:
- Query `orders` table: `select('id').eq('user_id', userId).eq('status', 'completed').limit(1)` → nếu 0 kết quả = first-time
- Áp dụng tại: `FirstTimeOnboarding.tsx`, `Checkout.tsx`

**UI (chung chung, KHÔNG ghi cụ thể từng gói)**:
- Banner gradient nổi bật:
  > 🎉 **Ưu đãi chào mừng dành riêng cho bạn**
  > Giảm tối đa lên đến gần 20% cho gói đăng ký đầu tiên
  > *(Không áp dụng cho tiện ích bổ sung)*
- Hiển thị tại: bước Plan (trên grid cards) + bước Checkout (trên order summary)
- Plan cards: giá gốc gạch ngang + giá welcome (nếu first-time)
- Order Summary: base plan hiển thị giá welcome, addon giữ nguyên

**planConfig.ts**: Thêm `welcomeMonthlyPrice` và `welcomeYearlyPrice` vào `PlanMeta`

**Backend `create-paypal-order`**: 
- Thêm `WELCOME_PRICES` map
- Query `orders` cho first-time verification server-side
- Dùng welcome price cho base amount nếu first-time
- Lưu `welcome_discount` vào order

**DB Migration**: Thêm cột `welcome_discount numeric default 0` vào `orders`

**i18n (`en.ts` + `vi.ts`)**: Thêm keys cho welcome banner

### Files cần sửa
- `src/lib/planConfig.ts` — thêm welcome prices
- `src/components/FirstTimeOnboarding.tsx` — xoá ScrollArea, thêm cycle toggle ở plan step, guide link, welcome offer banner + logic
- `src/pages/Checkout.tsx` — welcome offer banner + logic
- `supabase/functions/create-paypal-order/index.ts` — server-side welcome price validation
- `src/lib/i18n/en.ts` + `vi.ts` — welcome offer translations
- DB migration: `welcome_discount` column on `orders`

