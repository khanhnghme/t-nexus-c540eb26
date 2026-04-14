

## Plan: Fix 3 vấn đề 🟢 LOW — Tối ưu hiệu năng (cuối cùng)

### LOW #8: Image optimization — lazy loading cho avatars

**Vấn đề:** `UserAvatar` component dùng `AvatarImage` (từ Radix) không có `loading="lazy"`. Mỗi trang Dashboard, GroupDetail, MemberManagement hiển thị hàng chục avatar → tất cả load đồng thời.

**Giải pháp:**
- Thêm prop `loading="lazy"` vào `<AvatarImage>` trong `src/components/UserAvatar.tsx`
- Kiểm tra `src/components/ui/avatar.tsx` — nếu Radix `AvatarImage` không forward `loading` prop, thêm spread props hoặc custom attribute

**File:** `src/components/UserAvatar.tsx`, `src/components/ui/avatar.tsx`
**Impact:** Giảm bandwidth + requests đồng thời khi load trang có nhiều avatar

---

### LOW #9: Prefetch critical routes từ Login

**Vấn đề:** Khi user ở trang Login, chunk `/dashboard` chưa được tải. Sau login → phải đợi download chunk → delay.

**Giải pháp:**
- Trong `src/pages/Login.tsx`, thêm `useEffect` prefetch Dashboard chunk:
```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    import('../pages/Dashboard');
  }, 2000); // prefetch sau 2s idle
  return () => clearTimeout(timer);
}, []);
```
- Áp dụng tương tự ở `Landing.tsx` — prefetch Login chunk

**Files:** `src/pages/Login.tsx`, `src/pages/Landing.tsx`
**Impact:** Giảm perceived load time sau login ~30-50%

---

### LOW #10: Migrate Dashboard sang React Query

**Vấn đề:** `Dashboard.tsx` (1087 dòng) dùng hoàn toàn `useState` + `useEffect` cho data fetching. Không có caching, stale time, hay background refetch. Mỗi lần navigate lại Dashboard → fetch lại toàn bộ.

**Giải pháp:**
- Tạo custom hooks dùng `@tanstack/react-query` (đã có trong project):
  - `useDashboardData(userId)` — fetch projects, members, stats
  - `usePendingInvitations(userId)` — fetch pending invitations
  - `usePendingApprovals(userId)` — fetch pending approvals
- Config `staleTime: 30_000` (30s) để tránh re-fetch khi navigate back
- Config `refetchOnWindowFocus: true` để cập nhật khi user quay lại tab
- Giữ logic `Promise.all` đã tối ưu từ phase trước, chỉ wrap vào `useQuery`

**Files:** `src/pages/Dashboard.tsx` (refactor), tạo mới `src/hooks/useDashboardData.ts`
**Impact:** Cache data 30s, tránh re-fetch khi navigate back, background refresh

---

### Tổng kết

| # | Task | Files | Impact |
|---|------|-------|--------|
| 8 | Image lazy loading | 2 files (avatar components) | Bandwidth giảm |
| 9 | Prefetch critical chunks | 2 files (Login, Landing) | Post-login load -30% |
| 10 | React Query cho Dashboard | 2 files (Dashboard + new hook) | Cache + no re-fetch |

**Tổng: ~6 files thay đổi (1 file mới). Không thêm dependencies (React Query đã có). Backward compatible 100%.**

