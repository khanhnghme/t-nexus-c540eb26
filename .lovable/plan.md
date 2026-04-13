

## Plan: Nâng cấp hóa đơn — Logo, chữ ký, chi tiết hơn

### Tóm tắt
Cập nhật cả 2 invoice template (`PrintableInvoice` trong `CheckoutSummary.tsx` và `InvoiceTemplate.tsx`) — thêm logo T-Nexus, chữ ký điện tử, và bổ sung thông tin chi tiết.

### Changes

**File 1: `src/pages/CheckoutSummary.tsx`** — `PrintableInvoice` component
- **Logo**: Thay text "T-Nexus" ở header bằng `<img>` sử dụng `tNexusText` (import từ `@/assets/t-nexus-text.png`)
- **Thêm thông tin chi tiết**:
  - Mã hóa đơn (Invoice Number) format: `INV-{order_code}`
  - Email hỗ trợ: `support@t-nexus.io.vn`
  - Ghi chú thanh toán (payment notes / terms)
  - Billing cycle rõ ràng hơn: hiển thị số tháng/năm cụ thể
- **Chữ ký điện tử**: Thêm section trước footer với:
  - Dòng kẻ chữ ký
  - Text "Chữ ký điện tử / Electronic Signature"
  - Tên: "T-Nexus System"
  - Ngày ký = ngày thanh toán
  - Stamp style "PAID" cho đơn hoàn tất
- **Footer**: Thêm dòng "Liên hệ hỗ trợ" với email/website

**File 2: `src/components/billing/InvoiceTemplate.tsx`**
- **Logo**: Import `tNexusText` và thay "TaskFlow" bằng logo image
- **Thêm chi tiết**:
  - Invoice Number format
  - Billing period (nếu có `plan_started_at`, `plan_expires_at` trong profile)
  - Student ID từ profile
- **Chữ ký điện tử**: Tương tự PrintableInvoice
- **Footer**: Thêm contact info, cập nhật branding từ "TaskFlow" → "T-Nexus"

### Technical Details
- Logo dùng `import tNexusText from '@/assets/t-nexus-text.png'` (đã có sẵn trong project)
- Print CSS giữ nguyên, logo sẽ render đúng khi in
- Chữ ký là decorative (không phải digital signature thực), mục đích tạo cảm giác chuyên nghiệp

