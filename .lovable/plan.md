

## Plan: Fix PDF Invoice — Hỗ trợ hiển thị tiếng Việt đúng dấu

### Nguyên nhân gốc
PDF invoice đang dùng **StandardFonts.Helvetica** từ pdf-lib. Font Helvetica chỉ hỗ trợ bảng ký tự Latin-1, **không hỗ trợ tiếng Việt có dấu** (ă, ơ, ư, ễ, ệ...). Hàm `stripVietnamese()` buộc phải xóa hết dấu trước khi vẽ text → "HÓA ĐƠN" thành "HOA DON", "Đã thanh toán" thành "Da thanh toan".

File i18n (`email-i18n.ts`) cũng đã viết sẵn text PDF không dấu (e.g. `pdfHeader: 'HOA DON'`) vì biết font không hỗ trợ.

### Giải pháp
Embed **custom font hỗ trợ Unicode/Vietnamese** (Roboto hoặc Noto Sans) vào PDF thay vì dùng Helvetica.

### Các bước thực hiện

**1. Cập nhật `invoice-pdf-builder.ts`**
- Fetch font Roboto (Regular + Bold) từ Google Fonts CDN tại runtime:
  - `https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf` (Regular)
  - `https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf` (Bold)
- Dùng `pdfDoc.embedFont(fontBytes)` thay vì `StandardFonts.Helvetica`
- **Xóa hàm `stripVietnamese()`** — không cần strip dấu nữa
- Giữ `Courier` cho mã đơn hàng (ASCII, không cần Vietnamese)
- Thêm fallback: nếu fetch font fail → dùng Helvetica + strip như cũ

**2. Cập nhật `email-i18n.ts` — PDF labels viết đúng tiếng Việt**
- `pdfHeader: 'HÓA ĐƠN'` thay vì `'HOA DON'`
- `pdfSubHeader: 'Biên nhận thanh toán điện tử'` thay vì `'Bien nhan thanh toan dien tu'`
- Tương tự cho tất cả ~40 PDF labels tiếng Việt (pdfNotes, pdfStatus, pdfPaidStamp, v.v.)

**3. Deploy lại edge functions**
- Deploy: `payment-confirmation-email` (function duy nhất tạo PDF)

### Chi tiết kỹ thuật

```
// Fetch custom font
const [regBytes, boldBytes] = await Promise.all([
  fetch(ROBOTO_REGULAR_URL).then(r => r.arrayBuffer()),
  fetch(ROBOTO_BOLD_URL).then(r => r.arrayBuffer()),
]);
const fontRegular = await pdfDoc.embedFont(regBytes);
const fontBold = await pdfDoc.embedFont(boldBytes);
```

pdf-lib hỗ trợ embed TTF/OTF fonts với full Unicode subsetting → tiếng Việt hiển thị đúng dấu hoàn toàn.

### Kết quả
- PDF invoice hiển thị **đầy đủ dấu tiếng Việt** giống trang Summary trên web
- Không ảnh hưởng logic khác, chỉ thay font rendering

