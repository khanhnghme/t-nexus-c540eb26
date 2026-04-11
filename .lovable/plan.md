

## Xóa logo icon, chỉ giữ logo text làm nhận diện thương hiệu

### Phạm vi thay đổi

Xóa tất cả references đến file `t-nexus-logo.png` (logo icon hình ảnh), chỉ giữ lại 2 file logo text: `t-nexus-text.png` (dark) và `t-nexus-text-white.png` (light).

### Files cần sửa (10 files)

| File | Thay đổi |
|------|----------|
| **`src/components/TNexusLogo.tsx`** | Xóa import `tNexusLogo`, xóa `variant="icon"`, xóa `variant="full"` (icon+text). Chỉ giữ `variant="text"`. Xóa `TNexusIcon` export. |
| **`src/pages/Landing.tsx`** | Xóa import `tNexusLogo`. Thay tất cả chỗ dùng icon logo bằng text logo (`tNexusTextWhite`). Header, hero section, feature badge, footer — chỉ hiển thị text logo. |
| **`src/components/layout/TopBar.tsx`** | Xóa import `tNexusLogo`. Bỏ `<img src={tNexusLogo}>`, chỉ giữ text logo. |
| **`src/components/layout/DashboardLayout.tsx`** | Xóa import `tNexusLogo`. Sidebar và mobile header — bỏ icon logo, chỉ giữ text logo. |
| **`src/pages/Guide.tsx`** | Xóa import `tNexusLogo`. Header chỉ hiển thị text logo. |
| **`src/pages/Pricing.tsx`** | Xóa import `tNexusLogo`. Chỉ giữ text logo. |
| **`src/pages/Download.tsx`** | Xóa import `tNexusLogo`. Chỉ giữ text logo. |
| **`src/pages/ResetPassword.tsx`** | Đã dùng `variant="text"` — không cần đổi. |
| **`src/lib/projectEvidencePdf.ts`** | Thay `ettLogoImage` từ icon sang text logo (`t-nexus-text.png`). |
| **`src/lib/activityLogPdf.ts`** | Thay `ettLogoUrl` từ icon sang text logo (`t-nexus-text.png`). |

### Không xóa file asset

File `src/assets/t-nexus-logo.png` sẽ được giữ lại trong repo nhưng không còn được import ở bất kỳ đâu, tránh rủi ro nếu cần rollback.

### Không ảnh hưởng

- Các file chỉ dùng `variant="text"` (MemberAuthForm, RememberLoginScreen, Terms, Privacy, PricingDocs) — không cần thay đổi.
- `CheckoutLayoutWrapper.tsx` — đã dùng text logo, không có icon logo.

