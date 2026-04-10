

## Plan: Tạo trang Chính sách Quyền riêng tư (Privacy Policy) riêng biệt

### Mục tiêu
Tạo một trang `/guide/privacy` riêng biệt, tách khỏi trang Điều khoản dịch vụ (`/guide/terms`). Trang này sẽ có cùng layout/style với trang Terms hiện tại (sidebar TOC, responsive, markdown rendering).

### Các bước thực hiện

**1. Tạo nội dung Privacy Policy (2 ngôn ngữ)**
- Tạo file `src/lib/i18n/privacyContent.ts` chứa `PRIVACY_CONTENT_VI` và `PRIVACY_CONTENT_EN`
- Nội dung bao gồm: Thu thập dữ liệu, Sử dụng dữ liệu, Chia sẻ dữ liệu, Bảo mật, Cookie, Quyền của người dùng, Liên hệ, v.v.

**2. Tạo trang Privacy Policy**
- Tạo file `src/pages/Privacy.tsx` — clone từ `Terms.tsx` nhưng dùng `privacyContent` thay vì `policyContent`, icon `Lock` thay vì `Shield`, title khác

**3. Thêm routes**
- Trong `App.tsx`: thêm route `/guide/privacy` (EN) và `/vi/guide/privacy` (VI) — cùng pattern với `/guide/terms`

**4. Cập nhật link trên Landing page**
- Đổi link "Privacy Policy" trong footer từ `/guide/terms` → `/guide/privacy`

**5. Cập nhật i18n keys** (nếu cần thêm key mới cho trang Privacy)

### Chi tiết kỹ thuật
- Trang Privacy sẽ reuse toàn bộ pattern từ Terms.tsx: `extractToc`, `injectHeadingIds`, sidebar TOC, responsive mobile menu, `ReactMarkdown` với `rehypeRaw` + `remarkGfm`
- Route: `ForceLightMode` wrapper giống các trang guide khác

