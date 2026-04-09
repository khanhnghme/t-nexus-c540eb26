

## Plan: Triển khai chức năng Add-on — DB, logic giới hạn, UI quản lý

### Hiện trạng
- Add-on hiện chỉ là thông tin tĩnh hiển thị trên trang Pricing/Upgrade (3 loại: Projects, Storage, Members — $2.49/+5 đơn vị/tháng)
- Chưa có bảng DB lưu add-on đã mua
- `usePlanLimits` và `useAccountLimitsCheck` chỉ đọc giới hạn từ `plan_limits`, chưa cộng add-on
- Trang Service Plan chưa có tab/section quản lý add-on

### Thay đổi

**1. Migration — tạo bảng `user_addons`**
```sql
CREATE TABLE public.user_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addon_type text NOT NULL CHECK (addon_type IN ('projects', 'storage', 'members')),
  quantity integer NOT NULL DEFAULT 1,  -- số gói (mỗi gói = +5 đơn vị)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, addon_type)
);

ALTER TABLE public.user_addons ENABLE ROW LEVEL SECURITY;

-- Owner can manage own add-ons
CREATE POLICY "Users can view own addons" ON public.user_addons
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can upsert own addons" ON public.user_addons
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own addons" ON public.user_addons
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
```

**2. DB function — `get_owner_addon_bonus`**
```sql
CREATE FUNCTION public.get_owner_addon_bonus(_owner_id uuid)
RETURNS TABLE(bonus_projects int, bonus_storage_mb int, bonus_members int)
-- Trả về tổng bonus từ add-on: quantity * 5 (projects/members), quantity * 5 * 1024 (storage GB→MB)
```

**3. Hook mới — `useUserAddons.ts`**
- Fetch add-on data từ `user_addons` cho user hiện tại
- CRUD: thêm/bớt quantity
- Trả về `{ addons, updateAddon, isLoading }`

**4. Cập nhật `usePlanLimits.ts` — cộng add-on vào limit**
- Sau khi fetch `plan_limits`, query thêm `user_addons` của workspace owner
- Cộng bonus vào `maxTotalProjects`, `maxTotalMembers`, `maxStorageMb`
- Tương tự cho `useAccountLimitsCheck` / `useWorkspaceBilling`

**5. UI — Tab "Add-on" mới trên ServicePlan.tsx**

Thiết kế trực quan:
- Thêm tab `addon` vào TabsList (giữa Usage và Cleanup)
- Mỗi add-on type hiển thị dạng card ngang:
  - Icon + tên (Dự án / Lưu trữ / Thành viên)
  - Thanh hiển thị: `Gói cơ bản: X` + `Add-on: +Y` = `Tổng: Z`
  - Progress bar tổng hợp (base + addon vs usage hiện tại)
  - Nút `+` / `−` để tăng/giảm số gói add-on
  - Giá tính: `quantity × $2.49/tháng`
  - Badge giảm giá nếu plan Pro (-10%) hoặc Business (-20%)
- Dưới cùng: tổng chi phí add-on hàng tháng
- Nút "Xác nhận thay đổi" → toast "Coming Soon" (thanh toán chưa triển khai)
- Gói Free: hiển thị thông báo cần nâng cấp lên Plus+ để mua add-on

**6. UI — Cập nhật Usage tab (ServicePlan.tsx)**
- Mỗi card usage hiển thị rõ phần base limit vs add-on bonus
- Ví dụ: "15 (gói) + 10 (add-on) = 25 dự án"

**7. i18n — thêm chuỗi**
- Tab label, card titles, giải thích, CTA, discount badge, Coming Soon message

### Luồng hoạt động
```text
User → Service Plan → Tab Add-on
  → Thấy 3 card (Projects/Storage/Members)
  → Mỗi card hiển thị: usage hiện tại / (base + addon)
  → Bấm +/− để điều chỉnh số gói
  → Xem tổng chi phí → Bấm "Xác nhận" → Toast Coming Soon
```

### Files

| File | Thay đổi |
|------|----------|
| Migration SQL | Tạo bảng `user_addons` + RLS + function `get_owner_addon_bonus` |
| `src/hooks/useUserAddons.ts` | Hook mới: fetch/update add-on |
| `src/hooks/usePlanLimits.ts` | Cộng addon bonus vào limits |
| `src/hooks/useAccountLimitsCheck.ts` | Cộng addon bonus vào account limits |
| `src/pages/ServicePlan.tsx` | Thêm tab Add-on với UI quản lý trực quan |
| `src/lib/i18n/en.ts` | Thêm chuỗi add-on management |
| `src/lib/i18n/vi.ts` | Thêm chuỗi add-on management |

