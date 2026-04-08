

## Đồng bộ Typography cho Dashboard Pages

### Vấn đề
Các trang sau đăng nhập sử dụng typography không đồng nhất:
- Page titles: mix giữa `text-2xl`, `text-3xl`, `text-4xl`; có/không `font-heading`; `font-bold` vs `font-semibold`
- Section headings: `text-lg` vs `text-xl`, weight không thống nhất
- Descriptions: thiếu đồng bộ size và color
- Một số trang dùng inline `fontFamily` (Pricing/Upgrade), phần còn lại dùng Tailwind

### Tiêu chuẩn typography (dựa trên Pricing/Upgrade style)

```text
Level          │ Size          │ Weight    │ Font          │ Extra
───────────────┼───────────────┼───────────┼───────────────┼──────────────
Page Title     │ text-2xl      │ font-bold │ font-heading  │ tracking-tight
Section Title  │ text-lg       │ font-semibold │ font-heading │ —
Card Title     │ text-base     │ font-semibold │ (default)   │ —
Description    │ text-sm       │ font-normal   │ (default)   │ text-muted-foreground
Label          │ text-sm       │ font-medium   │ (default)   │ —
Caption/Meta   │ text-xs       │ font-normal   │ (default)   │ text-muted-foreground
Badge          │ text-[10px]   │ font-medium   │ (default)   │ —
Stat number    │ text-xl       │ font-bold     │ (default)   │ leading-none
```

### Files cần chỉnh

#### 1. `src/pages/Dashboard.tsx`
- `h1` user name: giữ `text-2xl font-heading font-bold` (đã đúng chuẩn)
- Stat numbers: đổi `text-xl` → giữ (đúng)
- CardTitle "My Projects": giữ `text-xl font-heading` → đổi thành `text-lg font-heading font-semibold`

#### 2. `src/pages/Groups.tsx`
- `h1 "Dự án của tôi"`: `text-3xl font-bold` → `text-2xl font-heading font-bold tracking-tight`

#### 3. `src/pages/Communication.tsx`
- `h1 "Trao đổi"`: `text-2xl font-bold font-heading` → thêm `tracking-tight` (gần đúng rồi)
- Stat numbers `text-2xl font-bold` → `text-xl font-bold`
- Empty state `text-lg` → giữ

#### 4. `src/pages/AccountSettings.tsx`
- `h1`: `text-2xl font-bold` → thêm `font-heading tracking-tight`

#### 5. `src/pages/WorkspaceSettings.tsx`
- `h1`: `text-2xl font-bold tracking-tight` → thêm `font-heading`
- Stat numbers: `text-2xl` → `text-xl`
- Section `h2 text-lg font-semibold` → thêm `font-heading`

#### 6. `src/pages/AdminUsers.tsx`
- `h1`: `text-3xl font-heading font-bold` → `text-2xl font-heading font-bold tracking-tight`

#### 7. `src/pages/AdminSystem.tsx`
- `h1`: `text-2xl font-bold` → thêm `font-heading tracking-tight`

#### 8. `src/pages/MemberManagement.tsx`
- `h1`: `text-3xl font-heading font-bold` → `text-2xl font-heading font-bold tracking-tight`

#### 9. `src/pages/Feedback.tsx`
- `h1`: `text-3xl font-bold` → `text-2xl font-heading font-bold tracking-tight`

#### 10. `src/pages/Notifications.tsx`
- Check page title heading and align to standard

#### 11. `src/pages/Calendar.tsx`
- Check page title heading and align to standard

#### 12. `src/pages/ServicePlan.tsx`, `src/pages/PersonalInfo.tsx`
- Align h1/section headings to standard

### Không thay đổi
- Layout / spacing / components — chỉ chỉnh class typography
- Pricing.tsx / Landing.tsx — các trang public giữ nguyên
- Routing, logic, contexts

### Tóm tắt
Thống nhất tất cả page title thành `text-2xl font-heading font-bold tracking-tight`, section title thành `text-lg font-heading font-semibold`, stat numbers thành `text-xl font-bold`. Khoảng 12 files cần chỉnh, mỗi file chỉ thay vài class CSS.

