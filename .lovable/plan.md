

## Plan: Fix logo T-Nexus bị rớt xuống trong PDF invoice

### Nguyên nhân
Dòng 149: `y: headerTopY - logoDisplayH + 6` — logo được đặt theo **bottom edge**, nên khi logo có tỷ lệ cao (height lớn), nó bị kéo xuống thấp hơn header. Offset `+6` không đủ bù.

### Giải pháp
Thay đổi logic positioning: **neo logo theo top edge** (cùng hàng với "INVOICE"/"HÓA ĐƠN"), không phụ thuộc vào chiều cao logo.

### Thay đổi trong `invoice-pdf-builder.ts`

**Dòng 144-152** — Sửa tính toán vị trí logo:
```typescript
if (logoImage) {
  const logoDisplayW = 130;
  const logoDisplayH = (logoImage.height / logoImage.width) * logoDisplayW;
  // Anchor logo TOP to same Y as header text top
  const logoTopY = headerTopY + 8; // slightly above "INVOICE" text baseline
  page.drawImage(logoImage, {
    x: pageW - margin - logoDisplayW,
    y: logoTopY - logoDisplayH,  // pdf-lib uses bottom-left origin
    width: logoDisplayW,
    height: logoDisplayH,
  });
}
```

Logic: `headerTopY` là baseline của text "INVOICE". Text size 22 nên top của chữ ≈ `headerTopY + 16`. Logo top neo ở `headerTopY + 8` (giữa baseline và top), rồi trừ `logoDisplayH` để ra bottom-left Y cho pdf-lib.

### Deploy
- Deploy: `payment-confirmation-email`

