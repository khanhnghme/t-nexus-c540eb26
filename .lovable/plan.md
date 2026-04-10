

## Tùy chỉnh trang chủ đáp ứng yêu cầu Google OAuth Verification

### Phân tích hiện trạng

Trang chủ (Landing.tsx) hiện có:
- ✅ Logo & brand nhận diện T-Nexus
- ✅ Mô tả chức năng app (hero description, feature sections)
- ✅ Link Privacy Policy & Terms of Service ở footer
- ✅ Hosted trên domain riêng (t-nexus.lovable.app / t-nexus.io.vn)
- ✅ Không yêu cầu login để xem trang chủ

### Còn thiếu / cần cải thiện

1. **Chưa giải thích minh bạch mục đích thu thập dữ liệu người dùng** — Google yêu cầu trang chủ phải nêu rõ lý do app yêu cầu quyền truy cập dữ liệu người dùng (ví dụ: Google login dùng để xác thực, email dùng để gửi thông báo).

2. **Link Privacy Policy cần dễ thấy hơn** — Hiện chỉ nằm ở cuối footer, nên thêm vào vị trí nổi bật hơn.

### Kế hoạch thực hiện

**Bước 1: Thêm section "Data & Privacy" trên trang chủ**
- Thêm một section mới (trước footer hoặc sau social proof) với tiêu đề như "Your data, your control" / "Dữ liệu của bạn, quyền kiểm soát của bạn"
- Nội dung giải thích ngắn gọn:
  - App sử dụng Google Sign-In chỉ để xác thực danh tính
  - Dữ liệu dự án được mã hóa và lưu trữ an toàn
  - Không chia sẻ dữ liệu với bên thứ ba
  - Người dùng có quyền xóa tài khoản và dữ liệu
- Kèm link nổi bật đến Privacy Policy và Terms of Service
- Thiết kế phù hợp dark theme hiện tại, icon Lock/Shield

**Bước 2: Cập nhật translations (en.ts & vi.ts)**
- Thêm các key mới cho section Data & Privacy (cả EN và VI)

**Bước 3: Đảm bảo Privacy Policy link khớp với Google consent screen**
- Link `/guide/privacy` và `/guide/terms` đã có sẵn ở footer — section mới sẽ link cùng đường dẫn

### Files cần chỉnh sửa
- `src/pages/Landing.tsx` — thêm section Data & Privacy
- `src/lib/i18n/en.ts` — thêm translations EN
- `src/lib/i18n/vi.ts` — thêm translations VI

