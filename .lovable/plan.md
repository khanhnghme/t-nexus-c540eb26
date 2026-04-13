

## Plan: Thêm mã QR vào hóa đơn (Summary + PDF đính kèm)

### Ý tưởng
Mã QR encode URL đến trang summary: `https://t-nexus.io.vn/checkout/summary/{orderCode}`. Quét QR → mở trực tiếp hóa đơn online.

### 1. PDF Invoice (`invoice-pdf-builder.ts`)
- Import `qrcode` từ `https://esm.sh/qrcode@1.5.3`
- Generate QR PNG buffer từ URL `https://t-nexus.io.vn/checkout/summary/{orderCode}`
- Embed QR vào PDF bằng `pdfDoc.embedPng()`, kích thước 60×60px
- Vị trí: góc trái cạnh PAID stamp, trong khối Signature

### 2. Web Summary (`InvoiceTemplate.tsx`)
- Cài `qrcode.react` (npm)
- Thêm prop `orderCode` để build URL
- Render `<QRCodeSVG>` kích thước 80×80px trong khối footer/signature
- URL: `https://t-nexus.io.vn/checkout/summary/{orderCode}`

### 3. Truyền dữ liệu (`CheckoutSummary.tsx`)
- Truyền `orderCode` vào `InvoiceTemplate`

### 4. Deploy
- Deploy `payment-confirmation-email`

### Files thay đổi
- `supabase/functions/_shared/invoice-pdf-builder.ts`
- `src/components/billing/InvoiceTemplate.tsx`
- `src/pages/CheckoutSummary.tsx`

