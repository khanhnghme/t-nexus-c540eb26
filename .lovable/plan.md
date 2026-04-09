

## Plan: Thêm Welcome Offer vào trang /upgrade

### Vấn đề
Trang `/upgrade` chưa kiểm tra và hiển thị ưu đãi chào mừng cho người mua lần đầu, trong khi Onboarding và Checkout đã có logic này.

### Giải pháp

**File: `src/pages/Upgrade.tsx`**

1. **Thêm state + query first-time buyer**: Import `supabase`, thêm `useEffect` query `orders` table kiểm tra `status = 'completed'` → set `isFirstTimeBuyer`

2. **Hiển thị Welcome Banner**: Nếu `isFirstTimeBuyer = true`, render banner gradient giống Onboarding/Checkout:
   > 🎉 Ưu đãi chào mừng dành riêng cho bạn
   > Giảm tối đa lên đến gần 20% cho gói đăng ký đầu tiên
   > (Không áp dụng cho tiện ích bổ sung)

   Đặt banner ngay trên toggle Monthly/Yearly.

3. **Hiển thị giá welcome trên Plan Cards**: Import `getWelcomePrice` từ `planConfig.ts`. Trong `PlanColumn`, nếu `isFirstTimeBuyer` và plan có welcome price:
   - Giá gốc gạch ngang (line-through)
   - Giá welcome hiển thị màu xanh lá

4. **Truyền `isFirstTimeBuyer` prop**: Từ component cha xuống `PlanColumn` và bảng comparison header.

### Files cần sửa
- `src/pages/Upgrade.tsx` — thêm first-time check, banner, giá welcome trên cards

